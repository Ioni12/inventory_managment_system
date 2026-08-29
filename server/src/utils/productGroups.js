/**
 * Centralized group merge/move logic for Product.groups[].
 * ALL state-changing operations (assign, return, repair, decommission,
 * import) must go through moveUnits() below rather than mutating
 * product.groups directly — this is what prevents duplicate groups for
 * the same (status, currentHolder) pair.
 */

function sameHolder(a, b) {
  return String(a || "") === String(b || "");
}

/**
 * Finds an existing group matching (status, currentHolder) on the given
 * product, or creates a new one (quantity 0) and returns it. Does NOT
 * save the product — caller is responsible for calling product.save().
 */
function findOrCreateGroup(product, status, currentHolder) {
  let group = product.groups.find(
    (g) => g.status === status && sameHolder(g.currentHolder, currentHolder),
  );
  if (!group) {
    product.groups.push({
      quantity: 0,
      status,
      currentHolder: currentHolder || null,
    });
    group = product.groups[product.groups.length - 1];
  }
  return group;
}

/**
 * Removes any group whose quantity has hit 0. Call after every decrement.
 */
function pruneEmptyGroups(product) {
  product.groups = product.groups.filter((g) => g.quantity > 0);
}

/**
 * Moves `quantity` units from a source group to a destination
 * (status, currentHolder) pair. Validates the source has enough quantity.
 * Does NOT save — caller must call product.save().
 *
 * @param {Document} product - a Product mongoose document
 * @param {Object} source - { status, currentHolder }
 * @param {Object} destination - { status, currentHolder }
 * @param {number} quantity - how many units to move (must be > 0)
 * @throws {Error} if the source group doesn't exist or has insufficient quantity
 */
function moveUnits(product, source, destination, quantity) {
  if (!quantity || quantity <= 0) {
    throw new Error("quantity must be a positive number");
  }

  const sourceGroup = product.groups.find(
    (g) =>
      g.status === source.status &&
      sameHolder(g.currentHolder, source.currentHolder),
  );

  if (!sourceGroup || sourceGroup.quantity < quantity) {
    throw new Error(
      `Cannot move ${quantity} unit(s): source group has only ${sourceGroup ? sourceGroup.quantity : 0} available`,
    );
  }

  sourceGroup.quantity -= quantity;

  const destGroup = findOrCreateGroup(
    product,
    destination.status,
    destination.currentHolder,
  );
  destGroup.quantity += quantity;

  pruneEmptyGroups(product);
}

module.exports = { findOrCreateGroup, pruneEmptyGroups, moveUnits, sameHolder };
