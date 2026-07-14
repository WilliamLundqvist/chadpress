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
 * Capability attribute definitions read from packages/ui/blocks/capabilities.json,
 * the single capability declaration shared with the TypeScript runtimes and the
 * contract validator.
 *
 * WordPress and WPGraphQL Content Blocks only expose attributes declared on the
 * registered block type, so capability attributes must be expanded here too.
 *
 * @return array<string,array<string,array<string,mixed>>>
 */
function chadpress_capability_attribute_definitions(): array
{
	static $definitions = null;

	if (null !== $definitions) {
		return $definitions;
	}

	$definitions = array();
	$file        = CHADPRESS_UI_DIR . '/blocks/capabilities.json';

	if (! is_readable($file)) {
		return $definitions;
	}

	$json = json_decode((string) file_get_contents($file), true);
	if (! is_array($json)) {
		return $definitions;
	}

	foreach ($json as $name => $capability) {
		if (is_array($capability['attributes'] ?? null)) {
			$definitions[$name] = $capability['attributes'];
		}
	}

	return $definitions;
}

/**
 * Merge capability attributes into a block declaration.
 *
 * Explicit block.json attributes override capability defaults.
 *
 * @param array<string,mixed> $block Block declaration.
 * @return array<string,array<string,mixed>>
 */
function chadpress_expand_block_capability_attributes(array $block): array
{
	$attributes    = is_array($block['attributes'] ?? null) ? $block['attributes'] : array();
	$capabilities  = is_array($block['capabilities'] ?? null) ? $block['capabilities'] : array();
	$definitions   = chadpress_capability_attribute_definitions();
	$from_caps     = array();

	foreach ($capabilities as $capability) {
		if (! is_string($capability) || ! isset($definitions[$capability])) {
			continue;
		}
		$from_caps = array_merge($from_caps, $definitions[$capability]);
	}

	return array_merge($from_caps, $attributes);
}

/**
 * Expand capability attributes before WordPress registers block types.
 *
 * @param array<string,mixed> $metadata Block metadata from block.json.
 * @return array<string,mixed>
 */
function chadpress_expand_block_type_metadata(array $metadata): array
{
	$name = $metadata['name'] ?? null;
	if (! is_string($name) || 0 !== strpos($name, 'chadpress/')) {
		return $metadata;
	}

	$metadata['attributes'] = chadpress_expand_block_capability_attributes($metadata);

	return $metadata;
}
add_filter('block_type_metadata', 'chadpress_expand_block_type_metadata');

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
 * Limit the editor to Chadpress-native custom blocks discovered from declarations.
 *
 * @param bool|string[] $allowed_block_types Existing block type restriction.
 * @param mixed         $block_editor_context Current block editor context.
 * @return string[]
 */
function chadpress_allowed_block_types($allowed_block_types, $block_editor_context): array
{
	$allowed = array();

	foreach (chadpress_block_declarations() as $name => $block) {
		if (
			is_string($name)
			&& 0 === strpos($name, 'chadpress/')
			&& is_array($block)
			&& chadpress_is_custom_block_declaration($block)
		) {
			$allowed[] = $name;
		}
	}

	return $allowed;
}
add_filter('allowed_block_types_all', 'chadpress_allowed_block_types', 10, 2);

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
 * Register Chadpress block patterns (compound blocks as starter markup).
 */
function chadpress_register_block_patterns(): void
{
	if (! function_exists('register_block_pattern')) {
		return;
	}

	if (function_exists('register_block_pattern_category')) {
		register_block_pattern_category(
			'chadpress',
			array(
				'label' => __('Chadpress', 'chadpress'),
			)
		);
	}

	register_block_pattern(
		'chadpress/standard-card',
		array(
			'title'       => __('Standard card', 'chadpress'),
			'description' => __('Card with header, title, and text.', 'chadpress'),
			'categories'  => array('chadpress'),
			'content'     => trim(
				<<<'PATTERN'
<!-- wp:chadpress/card -->
<!-- wp:chadpress/card-header -->
<!-- wp:chadpress/card-title {"cardTitle":"Card title"} /-->
<!-- /wp:chadpress/card-header -->
<!-- wp:chadpress/card-content -->
<!-- wp:chadpress/text {"content":"Card body text."} /-->
<!-- /wp:chadpress/card-content -->
<!-- /wp:chadpress/card -->
PATTERN
			),
		)
	);
}
add_action('init', 'chadpress_register_block_patterns');
