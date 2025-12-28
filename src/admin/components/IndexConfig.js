import { Card, CardBody, CardHeader, FormTokenField } from "@wordpress/components"
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

const availablePostTypes = [
	'Posts',
	'Resources',
	'Pages',
	'Products',
];

const IndexConfig = () => {
	const [postTypes, setPostTypes] = useState([]);

	// TODO: Fetch and set existing indexed post types from settings
	// TODO: Fetch available taxonomies and custom fields for further configuration
	// TODO: Handle saving the indexed post types to settings

	return (
		<Card>
			<CardHeader>
				<h2>Index Configuration</h2>
			</CardHeader>
			<CardBody>
				<FormTokenField
					__experimentalExpandOnFocus
					__experimentalValidateInput={(token) => availablePostTypes.includes(token)}
					__next40pxDefaultSize
					label={__('Indexed Post Types', 'yoko-core')}
					onChange={(value) => {
						console.log(value);
						setPostTypes(value);
					}}
					suggestions={availablePostTypes}
					value={postTypes}
				/>

				{/* TODO: Add taxonomies and custom fields configuration here */}
			</CardBody>
		</Card>
	);
}

export default IndexConfig;
