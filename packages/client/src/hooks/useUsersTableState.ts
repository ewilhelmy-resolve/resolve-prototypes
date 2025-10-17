import { useReducer } from "react";
import type { Member, OrganizationRole } from "@/types/member";

/**
 * State interface for UsersTable
 */
interface UsersTableState {
	// Selection
	selectedUsers: string[];
	// Search and sorting
	searchQuery: string;
	sortBy: "email" | "role" | "joinedAt";
	sortOrder: "asc" | "desc";
	// Dialog state
	editingUser: Member | null;
	deletingUser: Member | null;
	deactivatingUser: Member | null;
	// Sheet/Dialog visibility
	editSheetOpen: boolean;
	deleteDialogOpen: boolean;
	bulkDeleteDialogOpen: boolean;
	roleChangeDialogOpen: boolean;
	deactivateDialogOpen: boolean;
	// Pending changes
	pendingRoleChange: {
		userId: string;
		newRole: OrganizationRole;
		oldRole: OrganizationRole;
	} | null;
}

/**
 * Action types for the reducer
 */
type UsersTableAction =
	| { type: "SET_SELECTED_USERS"; payload: string[] }
	| { type: "SET_SEARCH_QUERY"; payload: string }
	| { type: "SET_SORT"; payload: { sortBy: "email" | "role" | "joinedAt"; sortOrder: "asc" | "desc" } }
	| { type: "TOGGLE_SORT"; payload: "email" | "role" | "joinedAt" }
	| { type: "OPEN_EDIT_SHEET"; payload: Member }
	| { type: "CLOSE_EDIT_SHEET" }
	| { type: "OPEN_DEACTIVATE_DIALOG"; payload: Member }
	| { type: "CLOSE_DEACTIVATE_DIALOG" }
	| { type: "OPEN_DELETE_DIALOG"; payload: Member }
	| { type: "CLOSE_DELETE_DIALOG" }
	| { type: "OPEN_BULK_DELETE_DIALOG" }
	| { type: "CLOSE_BULK_DELETE_DIALOG" }
	| { type: "OPEN_ROLE_CHANGE_DIALOG"; payload: { userId: string; newRole: OrganizationRole; oldRole: OrganizationRole } }
	| { type: "CLOSE_ROLE_CHANGE_DIALOG" };

/**
 * Initial state
 */
const initialState: UsersTableState = {
	selectedUsers: [],
	searchQuery: "",
	sortBy: "joinedAt",
	sortOrder: "desc",
	editingUser: null,
	deletingUser: null,
	deactivatingUser: null,
	editSheetOpen: false,
	deleteDialogOpen: false,
	bulkDeleteDialogOpen: false,
	roleChangeDialogOpen: false,
	deactivateDialogOpen: false,
	pendingRoleChange: null,
};

/**
 * Reducer function
 */
function usersTableReducer(
	state: UsersTableState,
	action: UsersTableAction,
): UsersTableState {
	switch (action.type) {
		case "SET_SELECTED_USERS":
			return { ...state, selectedUsers: action.payload };
		case "SET_SEARCH_QUERY":
			return { ...state, searchQuery: action.payload };
		case "SET_SORT":
			return { ...state, sortBy: action.payload.sortBy, sortOrder: action.payload.sortOrder };
		case "TOGGLE_SORT":
			if (state.sortBy === action.payload) {
				// Toggle order if clicking same column
				return { ...state, sortOrder: state.sortOrder === "asc" ? "desc" : "asc" };
			}
			// Set new column with default desc order
			return { ...state, sortBy: action.payload, sortOrder: "desc" };
		case "OPEN_EDIT_SHEET":
			return { ...state, editingUser: action.payload, editSheetOpen: true };
		case "CLOSE_EDIT_SHEET":
			return { ...state, editSheetOpen: false };
		case "OPEN_DEACTIVATE_DIALOG":
			return { ...state, deactivatingUser: action.payload, deactivateDialogOpen: true };
		case "CLOSE_DEACTIVATE_DIALOG":
			return { ...state, deactivateDialogOpen: false, deactivatingUser: null };
		case "OPEN_DELETE_DIALOG":
			return { ...state, deletingUser: action.payload, deleteDialogOpen: true };
		case "CLOSE_DELETE_DIALOG":
			return { ...state, deleteDialogOpen: false, deletingUser: null };
		case "OPEN_BULK_DELETE_DIALOG":
			return { ...state, bulkDeleteDialogOpen: true };
		case "CLOSE_BULK_DELETE_DIALOG":
			return { ...state, bulkDeleteDialogOpen: false };
		case "OPEN_ROLE_CHANGE_DIALOG":
			return { ...state, pendingRoleChange: action.payload, roleChangeDialogOpen: true };
		case "CLOSE_ROLE_CHANGE_DIALOG":
			return { ...state, roleChangeDialogOpen: false, pendingRoleChange: null };
		default:
			return state;
	}
}

/**
 * Custom hook to manage UsersTable state and UI interactions
 * Centralizes all state management for the users table component
 */
export function useUsersTableState() {
	const [state, dispatch] = useReducer(usersTableReducer, initialState);

	// Handlers - Selection
	const handleSelectAll = (checked: boolean, members: Member[]) => {
		dispatch({
			type: "SET_SELECTED_USERS",
			payload: checked ? members.map((member) => member.id) : [],
		});
	};

	const handleSelectUser = (userId: string, checked: boolean) => {
		dispatch({
			type: "SET_SELECTED_USERS",
			payload: checked
				? [...state.selectedUsers, userId]
				: state.selectedUsers.filter((id) => id !== userId),
		});
	};

	// Handlers - Dialogs
	const handleEditUser = (member: Member) => {
		dispatch({ type: "OPEN_EDIT_SHEET", payload: member });
	};

	const handleDeactivateUser = (member: Member) => {
		dispatch({ type: "OPEN_DEACTIVATE_DIALOG", payload: member });
	};

	const handleDeleteUser = (member: Member) => {
		dispatch({ type: "OPEN_DELETE_DIALOG", payload: member });
	};

	// Handler - Sorting
	const handleSort = (column: "email" | "role" | "joinedAt") => {
		dispatch({ type: "TOGGLE_SORT", payload: column });
	};

	// Setters
	const setSearchQuery = (query: string) => {
		dispatch({ type: "SET_SEARCH_QUERY", payload: query });
	};

	const setSelectedUsers = (users: string[]) => {
		dispatch({ type: "SET_SELECTED_USERS", payload: users });
	};

	const setEditSheetOpen = (open: boolean) => {
		if (!open) {
			dispatch({ type: "CLOSE_EDIT_SHEET" });
		}
	};

	const setDeleteDialogOpen = (open: boolean) => {
		if (!open) {
			dispatch({ type: "CLOSE_DELETE_DIALOG" });
		}
	};

	const setDeactivateDialogOpen = (open: boolean) => {
		if (!open) {
			dispatch({ type: "CLOSE_DEACTIVATE_DIALOG" });
		}
	};

	const setBulkDeleteDialogOpen = (open: boolean) => {
		if (open) {
			dispatch({ type: "OPEN_BULK_DELETE_DIALOG" });
		} else {
			dispatch({ type: "CLOSE_BULK_DELETE_DIALOG" });
		}
	};

	const setRoleChangeDialogOpen = (open: boolean) => {
		if (!open) {
			dispatch({ type: "CLOSE_ROLE_CHANGE_DIALOG" });
		}
	};

	const setPendingRoleChange = (
		change: {
			userId: string;
			newRole: OrganizationRole;
			oldRole: OrganizationRole;
		} | null,
	) => {
		if (change) {
			dispatch({ type: "OPEN_ROLE_CHANGE_DIALOG", payload: change });
		} else {
			dispatch({ type: "CLOSE_ROLE_CHANGE_DIALOG" });
		}
	};

	// Additional setters for direct state access (backward compatibility)
	const setEditingUser = (user: Member | null) => {
		if (user) {
			dispatch({ type: "OPEN_EDIT_SHEET", payload: user });
		}
	};

	const setDeletingUser = (user: Member | null) => {
		if (user) {
			dispatch({ type: "OPEN_DELETE_DIALOG", payload: user });
		}
	};

	const setDeactivatingUser = (user: Member | null) => {
		if (user) {
			dispatch({ type: "OPEN_DEACTIVATE_DIALOG", payload: user });
		}
	};

	return {
		// Selection
		selectedUsers: state.selectedUsers,
		setSelectedUsers,
		handleSelectAll,
		handleSelectUser,

		// Search and sorting
		searchQuery: state.searchQuery,
		setSearchQuery,
		sortBy: state.sortBy,
		sortOrder: state.sortOrder,
		handleSort,

		// Dialog state
		editingUser: state.editingUser,
		setEditingUser,
		deletingUser: state.deletingUser,
		setDeletingUser,
		deactivatingUser: state.deactivatingUser,
		setDeactivatingUser,

		// Dialog handlers
		handleEditUser,
		handleDeactivateUser,
		handleDeleteUser,

		// Sheet/Dialog visibility
		editSheetOpen: state.editSheetOpen,
		setEditSheetOpen,
		deleteDialogOpen: state.deleteDialogOpen,
		setDeleteDialogOpen,
		bulkDeleteDialogOpen: state.bulkDeleteDialogOpen,
		setBulkDeleteDialogOpen,
		roleChangeDialogOpen: state.roleChangeDialogOpen,
		setRoleChangeDialogOpen,
		deactivateDialogOpen: state.deactivateDialogOpen,
		setDeactivateDialogOpen,

		// Pending changes
		pendingRoleChange: state.pendingRoleChange,
		setPendingRoleChange,
	};
}
