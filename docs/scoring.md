# RADIX Talent Match - Scoring Methodology

This document details the deterministic scoring formulas used by the **Talent Check** and **Skill Match** services.

---

## 1. Candidate Skill Level Derivation (`candidate_level`)

For each of the 12 RADIX skill categories, a candidate's level (an integer from 1 to 9) is derived dynamically from their accumulated skills, internships, hackathons, and certifications.

### Formula
$$ \text{candidate\_level}(\text{category}) = \min\left(9, \max\left(1, \text{round}(\text{Base Score} + \text{Evidence Bonus})\right)\right) $$

If the candidate has absolutely no skills or activities in a category, the level defaults to `1`.

### 1.1 Base Score (Skills-Based)
The base score measures the depth of skills extracted or manually entered in a specific category.

$$ \text{Base Score} = \min(6.0, \sum_{s \in \text{skills}} \text{weight}(s.\text{confidence})) $$

Where skill confidence weights are defined as:
* **High Confidence:** $2.0$ points
* **Medium Confidence:** $1.0$ point
* **Low Confidence:** $0.5$ points

*Example:* A candidate with 2 high-confidence skills and 1 medium-confidence skill in `DSA` has a base score of $2.0 + 2.0 + 1.0 = 5.0$.

### 1.2 Evidence Bonus (Activities-Based)
The evidence bonus boosts the score if the candidate has real-world accomplishments (internships, hackathons, certifications) mapped to the category.

$$ \text{Evidence Bonus} = \sum \text{Bonus(Activity)} $$

Where Activity bonuses are defined as:
* **Internship:** $+2.0$ points per internship in the category
* **Hackathon:**
  * $+1.5$ points if the result indicates a podium finish (e.g., contains "Winner", "1st", "2nd", "3rd", "Runner up")
  * $+1.0$ point for general participation
* **Certification:** $+1.0$ point per certification in the category

*Mapping activities to categories:*
Activities are mapped to categories either:
1. **Explicitly** via user selection (the database tables support a nullable `category_code` column).
2. **Implicitly** via simple keyword-matching on the name, role, or organization (e.g. an internship with role "DevOps Intern" matches `CLOUD`).

---

## 2. Readiness Score (`readiness_score`)

The **Readiness Score** (0–100) measures how well a candidate fits a company's bar across all 12 skill categories.

### Formula
$$ \text{Readiness Score} = \min\left(100, \text{round}\left( \frac{\sum_{c} \text{Weight}_c \times \text{CategoryFit}_c}{\sum_{c} \text{Weight}_c} \times 100 \right)\right) $$

Where:
* $\text{CategoryFit}_c = \frac{\text{candidate\_level}_c}{\text{required\_level}_c}$
* $\text{Weight}_c$ is the weight of category $c$. By default, all categories are weighted equally ($\text{Weight}_c = 1.0$), but these can be overridden via configuration (e.g., system design might be weighted heavier for a Senior SWE role).

If a candidate meets or exceeds the bar for a category ($\text{candidate\_level} \ge \text{required\_level}$), the Category Fit for that category is capped at $1.0$.

---

## 3. Skill Match Score (`match_score`)

The **Skill Match Score** (0–100) measures how well a candidate fits a specific job description.

$$ \text{Skill Match Score} = \text{round}\left( \left( 0.7 \times \frac{\text{Matched Required Skills}}{\text{Total Required Skills}} + 0.3 \times \frac{\text{Matched Nice-To-Have Skills}}{\text{Total Nice-To-Have Skills}} \right) \times 100 \right) $$

If there are no Nice-To-Have skills specified in the JD, the score is based 100% on the Required Skills.

### Skill Matching Pipeline
1. **Exact Match:** Exact case-folded and normalized string match of the skill name.
2. **Fuzzy Match:** Token sort ratio using RapidFuzz above a threshold of `85`.
3. **Semantic Match:** Cosine similarity of skill name embeddings using `pgvector` or in-memory vector calculations above a threshold of `0.82`.
