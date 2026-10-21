// Each rule: IF the cart matches `when` (and does not match `unless`),
// THEN suggest the items in `suggest`.
// Names are matched case-insensitively against your menu.
// Rules higher in the list take priority.
module.exports = [
  {
    id: "burger-fries",
    when: { categories: ["Burgers"] },
    suggest: ["French Fries"],
    message: "Burgers go well with fries",
  },
  {
    id: "meal-drink",
    when: { categories: ["Burgers", "Pizza", "Pasta", "Sandwiches"] },
    unless: { categories: ["Beverages"] },
    suggest: ["Fresh Lime Soda", "Cold Coffee"],
    message: "Add a drink to your meal",
  },
  {
    id: "pizza-garlic-bread",
    when: { categories: ["Pizza"] },
    suggest: ["Garlic Bread"],
    message: "Garlic bread is a classic with pizza",
  },
  {
    id: "pasta-garlic-bread",
    when: { categories: ["Pasta"] },
    suggest: ["Garlic Bread"],
    message: "Garlic bread pairs well with pasta",
  },
  {
    id: "drink-bite",
    when: { categories: ["Beverages"] },
    unless: { categories: ["Burgers", "Pizza", "Pasta", "Sandwiches", "Sides"] },
    suggest: ["Grilled Sandwich", "Garlic Bread"],
    message: "Something to go with your drink",
  },
];