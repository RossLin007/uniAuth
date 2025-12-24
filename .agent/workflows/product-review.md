---
description: Conducts a deep-dive product review on a specific feature or the whole project.
---

---
title: Product Logic Review
description: Conducts a deep-dive product review on a specific feature or the whole project.
---

# Step 1: Context Gathering
- Read the project's @README.md and any design documents in @docs/ (if available).
- Ask the user: "Which specific feature or user flow do you want me to critique today? Or should I review the overall concept?"
- Wait for user input.

# Step 2: User Flow Simulation
- Based on the user's input and the code structure (e.g., look at the routes or UI components), simulate the user's journey step-by-step.
- *Instruction to Agent:* Describe the user journey aloud. For example: "The user clicks X, then the system loads Y..."

# Step 3: The Critique (Devil's Advocate)
- Switch to the @product_expert persona.
- Identify at least 3 potential friction points or logic gaps in the current design.
- Question the necessity of the feature: "Is this feature essential for MVP?"

# Step 4: Recommendations
- Propose 3 actionable improvements (e.g., "Simplify the registration flow," "Add a tooltip here," "Remove this button").
- Format the output as a Markdown table with columns: [Issue], [Impact], [Suggested Fix].