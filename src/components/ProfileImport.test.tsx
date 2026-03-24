import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileImport from './ProfileImport';

// ── Mock profile-store (Tauri store not available in jsdom) ─────────────────

let mockStoredInput = '';

vi.mock('../lib/profile-store', () => ({
  saveLastInput: vi.fn(async (input: string) => {
    mockStoredInput = input;
  }),
  loadLastInput: vi.fn(async () => mockStoredInput),
  clearLastInput: vi.fn(async () => {
    mockStoredInput = '';
  }),
}));

// ── Fixture ─────────────────────────────────────────────────────────────────

const VALID_SIMC_STRING = `shaman="Thrall"
level=80
race=orc
region=eu
server=draenor
spec=enhancement
talents=BYQAAAAAAAAAAAAAAAAAAAAAAgUSShQSQJRSSJkQSJAAAAAAAAgUSShQSSRSSJkQAJAAAAA

head=,id=235602,bonus_id=10355/10257/1498/8767/10271,gem_id=213743,enchant_id=7359
neck=,id=235610,bonus_id=10355/10257/1498/8767/10271
shoulder=,id=235604,bonus_id=10355/10257/1498/8767/10271
chest=,id=235600,bonus_id=10355/10257/1498/8767/10271
hands=,id=235603,bonus_id=10355/10257/1498/8767/10271
waist=,id=235607,bonus_id=10355/10257/1498/8767/10271
legs=,id=235605,bonus_id=10355/10257/1498/8767/10271
feet=,id=235608,bonus_id=10355/10257/1498/8767/10271
finger1=,id=235614,bonus_id=10355/10257/1498/8767/10271
finger2=,id=235615,bonus_id=10355/10257/1498/8767/10271
trinket1=,id=235616,bonus_id=10355/10257/1498/8767/10271
trinket2=,id=235617,bonus_id=10355/10257/1498/8767/10271
main_hand=,id=235620,bonus_id=10355/10257/1498/8767/10271
off_hand=,id=235621,bonus_id=10355/10257/1498/8767/10271`;

const INVALID_STRING = 'this is not a simc export at all';

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderComponent(onProfileParsed = vi.fn()) {
  const result = render(<ProfileImport onProfileParsed={onProfileParsed} />);
  return { onProfileParsed, ...result };
}

function getTextarea(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(/paste your simulationcraft/i);
}

/** Paste valid SimC string and wait for the profile summary to appear. */
async function pasteAndWaitForProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getTextarea());
  await user.paste(VALID_SIMC_STRING);
  await waitFor(() => {
    expect(screen.getByText('Thrall')).toBeInTheDocument();
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ProfileImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoredInput = '';
  });

  afterEach(cleanup);

  describe('initial render', () => {
    it('renders a textarea with placeholder', () => {
      renderComponent();
      expect(getTextarea()).toBeInTheDocument();
    });

    it('shows idle hint when empty', () => {
      renderComponent();
      expect(screen.getByText('SimulationCraft addon')).toBeInTheDocument();
    });

    it('does not show a clear button when empty', () => {
      renderComponent();
      expect(screen.queryByTitle('Clear')).not.toBeInTheDocument();
    });
  });

  describe('valid input', () => {
    it('shows character summary after pasting valid SimC string', async () => {
      const { onProfileParsed } = renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      expect(screen.getByText('Enhancement')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(onProfileParsed).toHaveBeenCalledWith(
        expect.objectContaining({ characterName: 'Thrall' }),
      );
    });

    it('shows equipped count in summary', async () => {
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      expect(screen.getByText(/\d+ equipped/)).toBeInTheDocument();
    });

    it('shows realm and region', async () => {
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      expect(screen.getByText(/Draenor-EU/)).toBeInTheDocument();
    });

    it('shows clear button when input is present', async () => {
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      expect(screen.getByTitle('Clear')).toBeInTheDocument();
    });

    it('hides idle hint after valid input', async () => {
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      expect(screen.queryByText('SimulationCraft addon')).not.toBeInTheDocument();
    });
  });

  describe('invalid input', () => {
    it('shows error for non-SimC text', async () => {
      const { onProfileParsed } = renderComponent();
      const user = userEvent.setup();

      await user.click(getTextarea());
      await user.paste(INVALID_STRING);

      await waitFor(() => {
        expect(
          screen.getByText(/doesn.t look like a SimC export/),
        ).toBeInTheDocument();
      });

      expect(onProfileParsed).not.toHaveBeenCalledWith(
        expect.objectContaining({ characterName: expect.any(String) }),
      );
    });

    it('does not show character summary for invalid input', async () => {
      renderComponent();
      const user = userEvent.setup();

      await user.click(getTextarea());
      await user.paste(INVALID_STRING);

      await waitFor(() => {
        expect(
          screen.getByText(/doesn.t look like a SimC export/),
        ).toBeInTheDocument();
      });

      expect(screen.queryByText('Thrall')).not.toBeInTheDocument();
    });
  });

  describe('clear button', () => {
    it('clears input and resets state', async () => {
      const { onProfileParsed } = renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      await user.click(screen.getByTitle('Clear'));

      expect(getTextarea()).toHaveValue('');
      expect(screen.queryByText('Thrall')).not.toBeInTheDocument();
      expect(onProfileParsed).toHaveBeenLastCalledWith(null);
    });

    it('shows idle hint again after clearing', async () => {
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);
      expect(screen.queryByText('SimulationCraft addon')).not.toBeInTheDocument();

      await user.click(screen.getByTitle('Clear'));

      expect(screen.getByText('SimulationCraft addon')).toBeInTheDocument();
    });

    it('calls clearLastInput on clear', async () => {
      const { clearLastInput } = await import('../lib/profile-store');
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      await user.click(screen.getByTitle('Clear'));
      expect(clearLastInput).toHaveBeenCalled();
    });
  });

  describe('session persistence', () => {
    it('saves input to store on paste', async () => {
      const { saveLastInput } = await import('../lib/profile-store');
      renderComponent();
      const user = userEvent.setup();

      await user.click(getTextarea());
      await user.paste(VALID_SIMC_STRING);

      await waitFor(() => {
        expect(saveLastInput).toHaveBeenCalledWith(VALID_SIMC_STRING);
      });
    });

    it('restores saved input on mount', async () => {
      mockStoredInput = VALID_SIMC_STRING;

      const { onProfileParsed } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Thrall')).toBeInTheDocument();
      });

      expect(getTextarea()).toHaveValue(VALID_SIMC_STRING);
      expect(onProfileParsed).toHaveBeenCalledWith(
        expect.objectContaining({ characterName: 'Thrall' }),
      );
    });

    it('does not restore if saved input is empty', async () => {
      mockStoredInput = '';
      const { onProfileParsed } = renderComponent();

      // Let the async load effect resolve
      await waitFor(() => {
        expect(getTextarea()).toHaveValue('');
      });

      expect(onProfileParsed).not.toHaveBeenCalledWith(
        expect.objectContaining({ characterName: expect.any(String) }),
      );
    });

    it('clears store when clearing via button', async () => {
      const { clearLastInput } = await import('../lib/profile-store');
      renderComponent();
      const user = userEvent.setup();

      await pasteAndWaitForProfile(user);

      await user.click(screen.getByTitle('Clear'));
      expect(clearLastInput).toHaveBeenCalled();
    });
  });

  describe('realm formatting', () => {
    it('formats hyphenated realm names', async () => {
      renderComponent();
      const user = userEvent.setup();

      const input = VALID_SIMC_STRING.replace(
        'server=draenor',
        'server=area-52',
      );

      await user.click(getTextarea());
      await user.paste(input);

      await waitFor(() => {
        expect(screen.getByText(/Area 52/)).toBeInTheDocument();
      });
    });
  });
});
