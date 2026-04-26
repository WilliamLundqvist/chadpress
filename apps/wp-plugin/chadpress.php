<?php

/**
 * Plugin Name: Chadpress
 * Description: Injects the Chadpress shadcn/Tailwind design system into the Gutenberg editor so admin preview is 1:1 with the Next.js frontend.
 * Version:     1.0.0
 *
 * @package Chadpress
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Register a block inserter category for Chadpress-native blocks.
 *
 * `layout` and other ad-hoc slugs are not core categories; unregistered
 * categories can hide blocks from the inserter. Use `chadpress` for our blocks.
 */
add_filter(
	'block_categories_all',
	static function (array $categories, $editor_context) {
		return array_merge(
			$categories,
			array(
				array(
					'slug'  => 'chadpress',
					'title' => 'Chadpress',
					'icon'  => null,
				),
			)
		);
	},
	10,
	2
);

/**
 * Directory where DDEV mounts `monorepo/packages/ui`.
 */
const CHADPRESS_UI_DIR = __DIR__ . '/chadpress-ui';

/**
 * Enqueue compiled editor CSS from the monorepo @repo/ui package.
 *
 * The DDEV bind mount maps `monorepo/packages/ui` →
 * `wp-content/plugins/chadpress-plugin/chadpress-ui` so `dist/editor.css`
 * is available after `pnpm --filter @repo/ui build:css` on the host.
 */
add_action(
	'after_setup_theme',
	function () {
		$rel  = 'chadpress-ui/dist/editor.css';
		$path = plugin_dir_path(__FILE__) . $rel;
		if (! is_readable($path)) {
			return;
		}
		$url = plugins_url($rel, __FILE__);
		add_editor_style(esc_url_raw($url));
	}
);

/**
 * Register the shared UI stylesheet so custom blocks get the same Tailwind
 * utilities inside Gutenberg's editor canvas.
 *
 * @return string|null Style handle, or null when the CSS has not been built.
 */
function chadpress_register_ui_editor_style(): ?string
{
	$handle = 'chadpress-ui-editor';
	$rel    = 'chadpress-ui/dist/editor.css';
	$path   = plugin_dir_path(__FILE__) . $rel;

	if (! is_readable($path)) {
		return null;
	}

	wp_register_style(
		$handle,
		plugins_url($rel, __FILE__),
		array(),
		(string) filemtime($path)
	);

	return $handle;
}

/**
 * Load Chadpress block declarations from packages/ui/blocks.
 *
 * @return array<string,array<string,mixed>>
 */
function chadpress_block_declarations(): array
{
	static $declarations = null;

	if (null !== $declarations) {
		return $declarations;
	}

	$declarations = array();
	$blocks_dir   = CHADPRESS_UI_DIR . '/blocks';

	if (! is_dir($blocks_dir)) {
		return $declarations;
	}

	$files = glob($blocks_dir . '/*/block.json');
	if (false === $files) {
		return $declarations;
	}

	foreach ($files as $file) {
		$json = json_decode((string) file_get_contents($file), true);
		if (! is_array($json) || empty($json['name']) || ! is_string($json['name'])) {
			continue;
		}
		$json['__file'] = $file;
		$json['__dir']  = dirname($file);
		$declarations[$json['name']] = $json;
	}

	return $declarations;
}

/**
 * Determine whether a declaration should be registered by Chadpress.
 *
 * @param array<string,mixed> $block Block declaration.
 * @return bool
 */
function chadpress_is_custom_block_declaration(array $block): bool
{
	$custom_editor = $block['customEditor'] ?? array();
	return is_array($custom_editor) && 'custom' === ($custom_editor['source'] ?? null);
}

/**
 * Register the generated Gutenberg editor bundle for Chadpress custom blocks.
 *
 * @return string|null Script handle, or null when the bundle has not been built.
 */
function chadpress_register_custom_blocks_editor_script(): ?string
{
	$handle      = 'chadpress-custom-blocks-editor';
	$script_rel  = 'build/index.js';
	$script_path = plugin_dir_path(__FILE__) . $script_rel;

	if (! is_readable($script_path)) {
		return null;
	}

	$asset_path = plugin_dir_path(__FILE__) . 'build/index.asset.php';
	$asset      = is_readable($asset_path)
		? include $asset_path
		: array(
			'dependencies' => array(
				'wp-block-editor',
				'wp-blocks',
				'wp-components',
				'wp-element',
			),
			'version'      => (string) filemtime($script_path),
		);

	$dependencies = is_array($asset) && is_array($asset['dependencies'] ?? null)
		? $asset['dependencies']
		: array();
	$version      = is_array($asset) && isset($asset['version'])
		? (string) $asset['version']
		: (string) filemtime($script_path);

	wp_register_script(
		$handle,
		plugins_url($script_rel, __FILE__),
		$dependencies,
		$version,
		true
	);

	return $handle;
}

/**
 * Register Chadpress-native custom blocks from mounted block declarations.
 */
function chadpress_register_custom_blocks(): void
{
	$editor_script = chadpress_register_custom_blocks_editor_script();
	$editor_style  = chadpress_register_ui_editor_style();

	foreach (chadpress_block_declarations() as $name => $block) {
		if (! is_string($name) || ! is_array($block) || ! chadpress_is_custom_block_declaration($block)) {
			continue;
		}

		$block_dir = $block['__dir'] ?? null;
		if (! is_string($block_dir) || ! is_readable($block_dir . '/block.json')) {
			continue;
		}

		$args = array();
		if (null !== $editor_script) {
			$args['editor_script'] = $editor_script;
		}
		if (null !== $editor_style) {
			$args['editor_style_handles'] = array($editor_style);
			$args['style_handles']        = array($editor_style);
		}

		register_block_type($block_dir, $args);
	}
}
add_action('init', 'chadpress_register_custom_blocks');

/**
 * Disable a supported editor feature according to a Chadpress `customEditor.disabledSupports` item.
 *
 * @param array<string,mixed> $supports Block supports.
 * @param string             $support  Chadpress support token.
 * @return array<string,mixed>
 */
function chadpress_disable_block_support(array $supports, string $support): array
{

	switch ($support) {
		case 'color':
			$supports['color'] = is_array($supports['color'] ?? null) ? $supports['color'] : array();
			$supports['color']['text'] = false;
			$supports['color']['link'] = false;
			$supports['color']['__experimentalDefaultControls'] = is_array($supports['color']['__experimentalDefaultControls'] ?? null)
				? $supports['color']['__experimentalDefaultControls']
				: array();
			$supports['color']['__experimentalDefaultControls']['text'] = false;
			break;

		case 'backgroundColor':
			$supports['color'] = is_array($supports['color'] ?? null) ? $supports['color'] : array();
			$supports['color']['background'] = false;
			$supports['color']['gradients']  = false;
			$supports['color']['__experimentalDefaultControls'] = is_array($supports['color']['__experimentalDefaultControls'] ?? null)
				? $supports['color']['__experimentalDefaultControls']
				: array();
			$supports['color']['__experimentalDefaultControls']['background'] = false;
			break;

		case 'fontSize':
			$supports['typography'] = is_array($supports['typography'] ?? null) ? $supports['typography'] : array();
			$supports['typography']['fontSize'] = false;
			$supports['typography']['__experimentalDefaultControls'] = is_array($supports['typography']['__experimentalDefaultControls'] ?? null)
				? $supports['typography']['__experimentalDefaultControls']
				: array();
			$supports['typography']['__experimentalDefaultControls']['fontSize'] = false;
			break;
		case '__experimentalFontWeight':
			$supports['typography'] = is_array($supports['typography'] ?? null) ? $supports['typography'] : array();
			$supports['typography']['__experimentalFontWeight'] = false;
			break;
		case '__experimentalFontStyle':
			$supports['typography'] = is_array($supports['typography'] ?? null) ? $supports['typography'] : array();
			$supports['typography']['__experimentalFontStyle'] = false;
			break;
		case '__experimentalTextTransform':
			$supports['typography'] = is_array($supports['typography'] ?? null) ? $supports['typography'] : array();
			$supports['typography']['__experimentalTextTransform'] = false;
			break;
		case '__experimentalTextDecoration':
			$supports['typography'] = is_array($supports['typography'] ?? null) ? $supports['typography'] : array();
			$supports['typography']['__experimentalTextDecoration'] = false;
			break;
		case '__experimentalLetterSpacing':
			$supports['typography'] = is_array($supports['typography'] ?? null) ? $supports['typography'] : array();
			$supports['typography']['__experimentalLetterSpacing'] = false;
			break;
	}
	return $supports;
}

/**
 * Apply `customEditor.disabledSupports` for a block name.
 *
 * @param string              $name     Block name, e.g. core/heading.
 * @param array<string,mixed> $supports Existing WordPress supports.
 * @return array<string,mixed>
 */
function chadpress_apply_disabled_supports(string $name, array $supports): array
{
	$declarations = chadpress_block_declarations();
	$block        = $declarations[$name] ?? null;

	if (! is_array($block)) {
		return $supports;
	}

	$custom_editor = $block['customEditor'] ?? array();
	if (! is_array($custom_editor) || 'core' !== ($custom_editor['source'] ?? null)) {
		return $supports;
	}

	$disabled = $custom_editor['disabledSupports'] ?? array();
	if (! is_array($disabled)) {
		return $supports;
	}

	foreach ($disabled as $support) {
		if (is_string($support)) {
			$supports = chadpress_disable_block_support($supports, $support);
		}
	}

	return $supports;
}

/**
 * Filter block metadata while WordPress registers blocks from block.json.
 *
 * @param array<string,mixed> $metadata Block metadata.
 * @return array<string,mixed>
 */
function chadpress_filter_block_type_metadata(array $metadata): array
{
	$name = $metadata['name'] ?? '';
	if (! is_string($name) || '' === $name) {
		return $metadata;
	}

	$supports = $metadata['supports'] ?? array();
	if (! is_array($supports)) {
		$supports = array();
	}

	$metadata['supports'] = chadpress_apply_disabled_supports($name, $supports);
	return $metadata;
}
add_filter('block_type_metadata', 'chadpress_filter_block_type_metadata', 20);

/**
 * Fallback filter for block registrations that have already resolved metadata.
 *
 * @param array<string,mixed> $args Block type registration args.
 * @param string              $name Block name.
 * @return array<string,mixed>
 */
function chadpress_filter_register_block_type_args(array $args, string $name): array
{
	$supports = $args['supports'] ?? array();
	if (! is_array($supports)) {
		$supports = array();
	}

	$args['supports'] = chadpress_apply_disabled_supports($name, $supports);
	return $args;
}
add_filter('register_block_type_args', 'chadpress_filter_register_block_type_args', 20, 2);
