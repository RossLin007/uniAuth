import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtpInput from './OtpInput';

describe('OtpInput', () => {
    it('renders 6 input boxes by default', () => {
        render(<OtpInput value="" onChange={() => { }} />);
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(6);
    });

    it('renders custom number of input boxes', () => {
        render(<OtpInput value="" onChange={() => { }} length={4} />);
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(4);
    });

    it('displays value in correct boxes', () => {
        render(<OtpInput value="123" onChange={() => { }} />);
        const inputs = screen.getAllByRole('textbox');
        expect(inputs[0]).toHaveValue('1');
        expect(inputs[1]).toHaveValue('2');
        expect(inputs[2]).toHaveValue('3');
        expect(inputs[3]).toHaveValue('');
    });

    it('calls onChange when digit is entered', async () => {
        const handleChange = vi.fn();
        render(<OtpInput value="" onChange={handleChange} />);
        const inputs = screen.getAllByRole('textbox');

        await userEvent.type(inputs[0], '1');
        expect(handleChange).toHaveBeenCalledWith('1');
    });

    it('handles paste of full code', async () => {
        const handleChange = vi.fn();
        render(<OtpInput value="" onChange={handleChange} />);
        const inputs = screen.getAllByRole('textbox');

        // Simulate paste
        await userEvent.click(inputs[0]);
        fireEvent.paste(inputs[0], {
            clipboardData: { getData: () => '123456' }
        });

        expect(handleChange).toHaveBeenCalledWith('123456');
    });

    it('only accepts numeric input', async () => {
        const handleChange = vi.fn();
        render(<OtpInput value="" onChange={handleChange} />);
        const inputs = screen.getAllByRole('textbox');

        await userEvent.type(inputs[0], 'a');
        // Should be called with empty string (non-numeric filtered out)
        expect(handleChange).toHaveBeenCalledWith('');
    });

    it('disables all inputs when disabled prop is true', () => {
        render(<OtpInput value="" onChange={() => { }} disabled />);
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach(input => {
            expect(input).toBeDisabled();
        });
    });

    it('handles backspace to clear and move to previous', async () => {
        const handleChange = vi.fn();
        render(<OtpInput value="12" onChange={handleChange} />);
        const inputs = screen.getAllByRole('textbox');

        // Focus on third input (which is empty) and press backspace
        await userEvent.click(inputs[2]);
        await userEvent.keyboard('{Backspace}');

        // Should clear the second digit
        expect(handleChange).toHaveBeenCalledWith('1');
    });

    it('has proper aria labels for accessibility', () => {
        render(<OtpInput value="" onChange={() => { }} />);
        const group = screen.getByRole('group');
        expect(group).toHaveAttribute('aria-label', '验证码输入');
    });
});
