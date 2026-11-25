import React from "react";

import {
  CODES,
  COLOR_PALETTE,
  DEFAULT_FILL_GRADIENT,
} from "@excalidraw/common";

import type {
  ExcalidrawElement,
  FillGradient,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import {
  actionChangeFillGradient,
  actionChangeFillStyle,
} from "../actions/actionProperties";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { act, fireEvent, render, screen } from "./test-utils";

import type { Action } from "../actions/types";

const { h } = window;

const mouse = new Pointer("mouse");

const run = (action: Action, value: unknown) =>
  act(() => {
    h.app.actionManager.executeAction(action, "ui", value);
  });

const rectangle = (
  props: { fillStyle?: "solid" | "gradient"; fillGradient?: FillGradient } = {},
) =>
  API.createElement({
    type: "rectangle",
    backgroundColor: "#ff0000",
    fillStyle: "gradient",
    ...props,
  });

const select = (...elements: NonDeletedExcalidrawElement[]) => {
  API.setElements(elements);
  API.setSelectedElements(elements);
};

const drawRectangle = () => {
  UI.clickTool("rectangle");
  mouse.down(10, 10);
  mouse.up(60, 60);
  return h.elements[h.elements.length - 1];
};

describe("fill gradient", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  afterEach(async () => {
    await act(async () => {});
  });

  describe("when the end color of a selected gradient shape is changed", () => {
    beforeEach(() => {
      select(rectangle());
      run(actionChangeFillGradient, { color: "#0000ff" });
    });

    it("changes the color and keeps the rest of the gradient", () => {
      expect(h.elements[0].fillGradient).toEqual({
        ...DEFAULT_FILL_GRADIENT,
        color: "#0000ff",
      });
    });

    it("remembers the gradient for new shapes", () => {
      expect(h.state.currentItemFillGradient).toEqual({
        ...DEFAULT_FILL_GRADIENT,
        color: "#0000ff",
      });
    });
  });

  describe("when the type of a selected gradient shape is changed", () => {
    beforeEach(() => {
      select(
        rectangle({
          fillGradient: { type: "linear", color: "#00ff00", angle: 45 },
        }),
      );
      run(actionChangeFillGradient, { type: "radial" });
    });

    it("keeps the shape's own color and angle", () => {
      expect(h.elements[0].fillGradient).toEqual({
        type: "radial",
        color: "#00ff00",
        angle: 45,
      });
    });
  });

  describe("when a shape that isn't filled with a gradient is selected", () => {
    beforeEach(() => {
      select(rectangle({ fillStyle: "solid" }));
      run(actionChangeFillGradient, { color: "#0000ff" });
    });

    it("leaves the shape without a gradient", () => {
      expect(h.elements[0]).not.toHaveProperty("fillGradient");
    });
  });

  describe("when a shape is drawn with the gradient fill current", () => {
    let drawn: ExcalidrawElement;

    beforeEach(() => {
      run(actionChangeFillStyle, "gradient");
      run(actionChangeFillGradient, { color: "#0000ff", angle: 180 });
      drawn = drawRectangle();
    });

    it("is filled with a gradient", () => {
      expect(drawn.fillStyle).toBe("gradient");
    });

    it("gets the current gradient", () => {
      expect(drawn.fillGradient).toEqual({
        type: "linear",
        color: "#0000ff",
        angle: 180,
      });
    });
  });

  describe("when a shape is drawn with another fill current", () => {
    let drawn: ExcalidrawElement;

    beforeEach(() => {
      drawn = drawRectangle();
    });

    it("has no gradient", () => {
      expect(drawn).not.toHaveProperty("fillGradient");
    });
  });

  describe("when a gradient shape's styles are pasted onto another shape", () => {
    const fillGradient: FillGradient = {
      type: "radial",
      color: "#0000ff",
      angle: 0,
    };

    beforeEach(() => {
      const source = rectangle({ fillGradient });
      const target = rectangle({ fillStyle: "solid" });
      API.setElements([source, target]);
      API.setSelectedElements([source]);
      Keyboard.withModifierKeys({ ctrl: true, alt: true }, () => {
        Keyboard.codeDown(CODES.C);
      });
      API.setSelectedElements([target]);
      Keyboard.withModifierKeys({ ctrl: true, alt: true }, () => {
        Keyboard.codeDown(CODES.V);
      });
    });

    it("gives it the gradient fill", () => {
      expect(h.elements[1].fillStyle).toBe("gradient");
    });

    it("gives it the gradient", () => {
      expect(h.elements[1].fillGradient).toEqual(fillGradient);
    });
  });

  describe("the properties panel", () => {
    describe("when a shape with another fill is selected", () => {
      beforeEach(() => {
        select(rectangle({ fillStyle: "solid" }));
      });

      it("hides the gradient controls", () => {
        expect(screen.queryByTestId("fill-gradient-type-linear")).toBeNull();
      });

      describe("and the gradient fill is picked", () => {
        beforeEach(() => {
          fireEvent.click(screen.getByTestId("fill-gradient"));
        });

        it("fills the shape with a gradient", () => {
          expect(h.elements[0].fillStyle).toBe("gradient");
        });

        it("shows the gradient controls", () => {
          expect(
            screen.queryByTestId("fill-gradient-type-linear"),
          ).not.toBeNull();
        });
      });
    });

    describe("when a linear gradient shape is selected", () => {
      beforeEach(() => {
        select(rectangle());
      });

      describe("and the radial type is picked", () => {
        beforeEach(() => {
          fireEvent.click(screen.getByTestId("fill-gradient-type-radial"));
        });

        it("makes the gradient radial", () => {
          expect(h.elements[0].fillGradient?.type).toBe("radial");
        });

        it("hides the angle", () => {
          expect(screen.queryByTestId("fill-gradient-angle")).toBeNull();
        });
      });

      describe("and the angle is changed", () => {
        beforeEach(() => {
          fireEvent.change(screen.getByTestId("fill-gradient-angle"), {
            target: { value: "135" },
          });
        });

        it("runs the gradient at that angle", () => {
          expect(h.elements[0].fillGradient?.angle).toBe(135);
        });
      });

      describe("and an end color is picked", () => {
        beforeEach(() => {
          fireEvent.click(
            screen.getByTestId(`fill-gradient-color-${COLOR_PALETTE.blue[2]}`),
          );
        });

        it("ends the gradient on that color", () => {
          expect(h.elements[0].fillGradient?.color).toBe(COLOR_PALETTE.blue[2]);
        });
      });
    });
  });
});
