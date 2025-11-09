/**
 * TheophilusX
 * Copyright (C) 2025 caelondev
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file for details.
 */

export default (str: string) => {
  const num = Number(str);
  return !isNaN(num) && isFinite(num);
}

