import { __experimentalHStack as HStack, SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { useAdminContext } from "../AdminContext";

const FacetOverrides = ({ index }) => {
	const { getAvailableIndexingParameters } = useAdminContext();
	return (
		<>
			<h4>{__('Facet Type Overrides', 'instantsearch-for-wp')}</h4>
			<p>TODO: Add refinement type override for individual facets.</p>
			<HStack spacing={4}>
				<SelectControl
					name="facet-field-example"
					label={__('Facet', 'instantsearch-for-wp')}
					value="example_field"
					options={[
						{ label: __('Select type override', 'instantsearch-for-wp'), value: '' },
						{ label: __('Post Type', 'instantsearch-for-wp'), value: 'post_type' },
						...(
							Object.entries(getAvailableIndexingParameters().taxonomies).
								filter(([key]) => index?.taxonomies?.includes(key)).
								map(([key, label]) => ({ label, value: key })))
					]}
					onChange={() => {}}
					style={{ flex: 1 }}
				/>
				<SelectControl
					name="facet-field-example-2"
					label={__('Facet Type Override', 'instantsearch-for-wp')}
					value="example_field_2"
					options={[
						{ label: __('Select type override', 'instantsearch-for-wp'), value: '' },
						{ label: __('Refinement List', 'instantsearch-for-wp'), value: 'refinementList' },
						{ label: __('Menu', 'instantsearch-for-wp'), value: 'menu' },
					]}
					onChange={() => {}}
					style={{ flex: 1 }}
				/>
			</HStack>
		</>
	);
}

export default FacetOverrides;