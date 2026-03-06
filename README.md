# Global Trust and Understanding of Science

An interactive world map visualizing survey data on how people across the globe perceive science, scientists, and health institutions. Built with D3.js.

**Live site:** [https://Archaeo-Programmer.github.io/ds3-map-project](https://Archaeo-Programmer.github.io/ds3-map-project)

---

## About the Data

Data is drawn from the **Wellcome Global Monitor — COVID-19 (2020)**, a survey of more than 119,000 people across 113 countries conducted by Gallup on behalf of the Wellcome Trust. It is one of the largest studies ever carried out into how people around the world think and feel about science and major health challenges.

**Source:** [Wellcome Global Monitor — COVID-19, 2020](https://wellcome.org/insights/reports/wellcome-global-monitor-covid-19/2020)

### A note on the percentages

Each value on the map represents the percentage of respondents in that country who gave the **single most positive response** to that question. Response categories are not combined or grouped — for example, a figure of 40% means 40% of respondents chose the top response option only, not a combined "positive" category.

---

## Survey Questions

The six variables are drawn from the Wellcome Global Monitor wave 2 (2020) dataset. Variable IDs refer to the official data dictionary.

**1. Knowledge of Science** *(W1)*
*"How much do you, personally, know about science?"*
Response options: A lot / Some / Not much / Nothing at all / DK–Refused
**Percentage shown:** respondents who answered **"A lot"**

**2. Understanding of Science and Scientists** *(W2)*
*"How much do you understand the meaning of science and scientists?"*
Response options: All of it / Some of it / Not much of it / None of it / DK–Refused
**Percentage shown:** respondents who answered **"All of it"**

**3. Confidence in Hospitals and Health Clinics** *(W4)*
*"How much confidence do you have in hospitals and health clinics in [country]?"*
Response options: A lot / Some / Not much / None at all / DK–Refused
**Percentage shown:** respondents who answered **"A lot"**

**4. Trust in the National Government** *(W5B)*
*"How much do you trust the national government in this country?"*
Response options: A lot / Some / Not much / Not at all / DK–Refused
**Percentage shown:** respondents who answered **"A lot"**

**5. Trust in Scientists** *(W5C)*
*"How much do you trust scientists in this country?"*
Response options: A lot / Some / Not much / Not at all / DK–Refused
**Percentage shown:** respondents who answered **"A lot"**

**6. Trust in Doctors and Nurses** *(W5E)*
*"How much do you trust doctors and nurses in this country?"*
Response options: A lot / Some / Not much / Not at all / DK–Refused
**Percentage shown:** respondents who answered **"A lot"**

---

## Features

- **Interactive choropleth map** — view data as absolute values or as a deviation from the global average
- **Country search** — type a country name to zoom to it and open its detail panel
- **Click-to-detail panel** — click any country to see a bar chart comparing all six metrics against the global average, along with a country ranking for the selected question
- **Zoom and pan** — scroll to zoom, drag to pan; click a country to zoom directly to it
- **Reset Zoom** — returns the map to its default view and closes the detail panel

---

## Running Locally

The map loads data files at runtime and must be served over HTTP rather than opened directly as a file. From the project directory:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Built With

- [D3.js v7](https://d3js.org/)
- [TopoJSON v3](https://github.com/topojson/topojson)
- [Natural Earth 110m world boundaries](https://www.naturalearthdata.com/)
- [Google Fonts — Spectral & Open Sans](https://fonts.google.com/)
