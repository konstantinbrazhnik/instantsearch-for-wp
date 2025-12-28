import { createContext, useContext } from "@wordpress/element";
import useSettings from "../hooks/use-settings";

const AdminContext = createContext({});

const AdminProvider = ( { children } ) => {

	const value = useSettings();

	return (
		<AdminContext.Provider value={ value }>
			{ children }
		</AdminContext.Provider>
	);
};

const useAdminContext = () => useContext( AdminContext );

export { useAdminContext, AdminProvider };