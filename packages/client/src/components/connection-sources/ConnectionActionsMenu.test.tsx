/**
 * ConnectionActionsMenu.test.tsx - Unit tests for connection actions dropdown menu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionActionsMenu } from './ConnectionActionsMenu';

describe('ConnectionActionsMenu', () => {
	const mockOnEdit = vi.fn();
	const mockOnDisconnect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the menu trigger button', () => {
		render(<ConnectionActionsMenu />);
		const trigger = screen.getByRole('button');
		expect(trigger).toBeInTheDocument();
	});

	it('should show Edit option when onEdit is provided', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onEdit={mockOnEdit} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const editOption = await screen.findByText('actions.edit');
		expect(editOption).toBeInTheDocument();
	});

	it('should show Disconnect option when onDisconnect is provided', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const disconnectOption = await screen.findByText('actions.disconnect');
		expect(disconnectOption).toBeInTheDocument();
	});

	it('should call onEdit when Edit is clicked', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onEdit={mockOnEdit} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const editOption = await screen.findByText('actions.edit');
		await user.click(editOption);

		expect(mockOnEdit).toHaveBeenCalledTimes(1);
	});

	it('should call onDisconnect when Disconnect is clicked', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const disconnectOption = await screen.findByText('actions.disconnect');
		await user.click(disconnectOption);

		expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
	});

	it('should show both options when both callbacks provided', async () => {
		const user = userEvent.setup();
		render(
			<ConnectionActionsMenu
				onEdit={mockOnEdit}
				onDisconnect={mockOnDisconnect}
			/>
		);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const editOption = await screen.findByText('actions.edit');
		const disconnectOption = await screen.findByText('actions.disconnect');

		expect(editOption).toBeInTheDocument();
		expect(disconnectOption).toBeInTheDocument();
	});

	it('should not show Edit option when onEdit is not provided', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const editOption = screen.queryByText('actions.edit');
		expect(editOption).not.toBeInTheDocument();
	});

	it('should not show Disconnect option when onDisconnect is not provided', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onEdit={mockOnEdit} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const disconnectOption = screen.queryByText('actions.disconnect');
		expect(disconnectOption).not.toBeInTheDocument();
	});

	it('should have destructive styling on Disconnect option', async () => {
		const user = userEvent.setup();
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		await user.click(trigger);

		const disconnectOption = await screen.findByText('actions.disconnect');
		expect(disconnectOption.closest('[role="menuitem"]')).toHaveClass('text-destructive');
	});
});
