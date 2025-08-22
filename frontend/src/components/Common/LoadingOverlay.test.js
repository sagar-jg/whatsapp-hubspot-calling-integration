import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import LoadingOverlay from './LoadingOverlay';
import theme from '../../theme';

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    renderWithTheme(<LoadingOverlay />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    const customMessage = 'Processing your request...';
    renderWithTheme(<LoadingOverlay message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('can be hidden', () => {
    renderWithTheme(<LoadingOverlay open={false} />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('applies correct styling', () => {
    renderWithTheme(<LoadingOverlay />);
    
    const backdrop = screen.getByText('Loading...').closest('[role="presentation"]');
    expect(backdrop).toHaveStyle({
      backgroundColor: 'rgba(0, 0, 0, 0.7)'
    });
  });
});