/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

import figlet from "figlet";
import gradient from "gradient-string";

export const logTX = (): void => {
  const text = figlet.textSync("TheophilusX", {
    font: "Rectangles",
    horizontalLayout: "full",
    verticalLayout: "default",
  });

  const gradientText = gradient(["cyan", "magenta"])(text);

  console.log("\n" + gradientText + "\n");
};

export default logTX;
