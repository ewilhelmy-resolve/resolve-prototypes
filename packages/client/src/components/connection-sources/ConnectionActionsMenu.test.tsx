/**
 * ConnectionActionsMenu.test.tsx - Unit tests for connection actions dropdown menu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
		render(<ConnectionActionsMenu onEdit={mockOnEdit} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const editOption = await screen.findByText('Edit');
		expect(editOption).toBeInTheDocument();
	});

	it('should show Disconnect option when onDisconnect is provided', async () => {
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const disconnectOption = await screen.findByText('Disconnect');
		expect(disconnectOption).toBeInTheDocument();
	});

	it('should call onEdit when Edit is clicked', async () => {
		render(<ConnectionActionsMenu onEdit={mockOnEdit} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const editOption = await screen.findByText('Edit');
		fireEvent.click(editOption);

		expect(mockOnEdit).toHaveBeenCalledTimes(1);
	});

	it('should call onDisconnect when Disconnect is clicked', async () => {
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const disconnectOption = await screen.findByText('Disconnect');
		fireEvent.click(disconnectOption);

		expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
	});

	it('should show both options when both callbacks provided', async () => {
		render(
			<ConnectionActionsMenu
				onEdit={mockOnEdit}
				onDisconnect={mockOnDisconnect}
			/>
		);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const editOption = await screen.findByText('Edit');
		const disconnectOption = await screen.findByText('Disconnect');

		expect(editOption).toBeInTheDocument();
		expect(disconnectOption).toBeInTheDocument();
	});

	it('should not show Edit option when onEdit is not provided', async () => {
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const editOption = screen.queryByText('Edit');
		expect(editOption).not.toBeInTheDocument();
	});

	it('should not show Disconnect option when onDisconnect is not provided', async () => {
		render(<ConnectionActionsMenu onEdit={mockOnEdit} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const disconnectOption = screen.queryByText('Disconnect');
		expect(disconnectOption).not.toBeInTheDocument();
	});

	it('should have destructive styling on Disconnect option', async () => {
		render(<ConnectionActionsMenu onDisconnect={mockOnDisconnect} />);

		const trigger = screen.getByRole('button');
		fireEvent.click(trigger);

		const disconnectOption = await screen.findByText('Disconnect');
		expect(disconnectOption.closest('[role="menuitem"]')).toHaveClass('text-destructive');
	});
});
