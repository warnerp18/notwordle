import Keyboard from "./Keyboard";

import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";

describe("<Keyboard />", () => {
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it("renders a keyboard with every letter plus Enter and Backspace", () => {
    render(<Keyboard buttonPress={jest.fn()} disabled={false} />);

    const keyboard = screen.getByRole("group", { name: "Keyboard" });
    expect(keyboard).toBeInTheDocument();

    // 26 letters + Enter + Backspace
    expect(screen.getAllByRole("button")).toHaveLength(28);
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(screen.getByRole("button", { name: letter })).toBeInTheDocument();
    }
  });

  it("sends the letter when a letter key is clicked", async () => {
    const buttonPress = jest.fn();
    render(<Keyboard buttonPress={buttonPress} disabled={false} />);

    // one key from each row, since each row has its own click handler
    await user.click(screen.getByRole("button", { name: "Q" }));
    await user.click(screen.getByRole("button", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "Z" }));

    expect(buttonPress.mock.calls).toEqual([["Q"], ["A"], ["Z"]]);
  });

  it("sends Enter and Backspace for the special keys", async () => {
    const buttonPress = jest.fn();
    render(<Keyboard buttonPress={buttonPress} disabled={false} />);

    await user.click(screen.getByRole("button", { name: "ENTER" }));
    await user.click(screen.getByRole("button", { name: "Backspace" }));

    expect(buttonPress.mock.calls).toEqual([["Enter"], ["Backspace"]]);
  });

  it("disables every key and sends nothing when disabled", async () => {
    const buttonPress = jest.fn();
    render(<Keyboard buttonPress={buttonPress} disabled={true} />);

    for (const key of screen.getAllByRole("button")) {
      expect(key).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: "Q" }));

    expect(buttonPress).not.toHaveBeenCalled();
  });
});
