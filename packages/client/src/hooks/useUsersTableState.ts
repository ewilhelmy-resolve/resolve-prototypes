import { useReducer } from "react";
import type { Member, OrganizationRole } from "@/types/member";

/**
 * State interface for UsersTable
 */
interface UsersTableState {
	// Selection
	selectedUsers: string[];
	// Search and sorting
	searchInput: string; // Immediate input value
	searchQuery: string; // Debounced value for API
	statusFilter: "All" | "active" | "inactive";
	sortBy: "name" | "role" | "status" | "joinedAt" | "conversationsCount";
	sortOrder: "asc" | "desc";
	// Pagination
	page: number;
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
	| { type: "SET_SEARCH_INPUT"; payload: string }
	| { type: "SET_SEARCH_QUERY"; payload: string }
	| { type: "SET_STATUS_FILTER"; payload: "All" | "active" | "inactive" }
	| { type: "SET_PAGE"; payload: number }
	| { type: "SET_SORT"; payload: { sortBy: "name" | "role" | "status" | "joinedAt" | "conversationsCount"; sortOrder: "asc" | "desc" } }
	| { type: "TOGGLE_SORT"; payload: "name" | "role" | "status" | "joinedAt" | "conversationsCount" }
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
	searchInput: "",
	searchQuery: "",
	statusFilter: "All",
	sortBy: "joinedAt",
	sortOrder: "desc",
	page: 0,
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
		case "SET_SEARCH_INPUT":
			return { ...state, searchInput: action.payload };
		case "SET_SEARCH_QUERY":
			return { ...state, searchQuery: action.payload, page: 0 };
		case "SET_STATUS_FILTER":
			return { ...state, statusFilter: action.payload, page: 0, selectedUsers: [] };
		case "SET_PAGE":
			return { ...state, page: action.payload, selectedUsers: [] };
		case "SET_SORT":
			return { ...state, sortBy: action.payload.sortBy, sortOrder: action.payload.sortOrder, page: 0 };
		case "TOGGLE_SORT":
			if (state.sortBy === action.payload) {
				// Toggle order if clicking same column
				return { ...state, sortOrder: state.sortOrder === "asc" ? "desc" : "asc", page: 0 };
			}
			// Set new column with default desc order
			return { ...state, sortBy: action.payload, sortOrder: "desc", page: 0 };
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
	const handleSort = (column: "name" | "role" | "status" | "joinedAt" | "conversationsCount") => {
		dispatch({ type: "TOGGLE_SORT", payload: column });
	};

	// Setters
	const setSearchInput = (input: string) => {
		dispatch({ type: "SET_SEARCH_INPUT", payload: input });
	};

	const setSearchQuery = (query: string) => {
		dispatch({ type: "SET_SEARCH_QUERY", payload: query });
	};

	const setStatusFilter = (filter: "All" | "active" | "inactive") => {
		dispatch({ type: "SET_STATUS_FILTER", payload: filter });
	};

	const setPage = (page: number) => {
		dispatch({ type: "SET_PAGE", payload: page });
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

		// Search, filtering and sorting
		searchInput: state.searchInput,
		setSearchInput,
		searchQuery: state.searchQuery,
		setSearchQuery,
		statusFilter: state.statusFilter,
		setStatusFilter,
		sortBy: state.sortBy,
		sortOrder: state.sortOrder,
		handleSort,

		// Pagination
		page: state.page,
		setPage,

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
