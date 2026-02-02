import { Card, CardBody, CardHeader, FormTokenField, MenuGroup, MenuItem, Spinner } from "@wordpress/components"
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useAdminContext } from "./AdminContext";
import IndexOptions from "./IndexOptions";

const AdminIndexes = () => {
	const { getAvailableIndexingParameters } = useAdminContext();

	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchPostTypes() {
			await getAvailableIndexingParameters();

			setLoading(false);
		}
		fetchPostTypes();
	}, []);

	return (
		<>
			<CardHeader>
				<h2>{__('Index Configuration', 'instantsearch-for-wp')}</h2>
			</CardHeader>
			<CardBody>
				{loading
					? <Spinner />
					: <IndexOptions key={0} index={{}} indexId={0} />
				}
			</CardBody>
		</>
	);
}

export default AdminIndexes;
