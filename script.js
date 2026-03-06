// ── Dimensions & SVG ──────────────────────────────────────────────────────────
const width = 900, height = 500;

const svg = d3.select("#map")
    .attr("width", width)
    .attr("height", height)
    .style("position", "relative");

// ── Projection ────────────────────────────────────────────────────────────────
const projection = d3.geoNaturalEarth1()
    .scale(width / 5)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// ── Color scales ──────────────────────────────────────────────────────────────
const categoricalColors = ["#2166ac", "#67a9cf", "#ffffbf", "#fddbc7", "#ef8a62", "#b2182b"];

const diffColorBins = [
    "#40004B", "#762B83", "#9971AC", "#C2A6CF", "#E7D4E8",
    "#DAF0D4", "#A6DBA1", "#5AAE61", "#1B7837", "#00441B"
];

// ── View selector ─────────────────────────────────────────────────────────────
const viewSelector = document.getElementById("mapModeSelector");

// ── Legend div reference ──────────────────────────────────────────────────────
const legendDiv = d3.select("#legend");

// ── Tooltip ───────────────────────────────────────────────────────────────────
const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden");

// ── Load data ─────────────────────────────────────────────────────────────────
Promise.all([
    d3.json("data/world-110m.json"),
    d3.csv("data/wgm_6_variables_pct.csv")
]).then(([world, data]) => {

    const countries = topojson.feature(world, world.objects.countries);

    // ── Compute global averages ───────────────────────────────────────────────
    const averages = {};
    const groupsToDedup = new Set(["Asian & Pacific Islands", "Other Caribbean", "Other Sub-Saharan Africa"]);

    data.columns.forEach(col => {
        if (col !== "country") {
            const seenGroups = new Set();
            const values = [];
            data.forEach(d => {
                const value = +d[col];
                if (isNaN(value)) return;
                if (groupsToDedup.has(d.group)) {
                    if (!seenGroups.has(d.group)) {
                        values.push(value);
                        seenGroups.add(d.group);
                    }
                } else {
                    values.push(value);
                }
            });
            averages[col] = values.length ? d3.mean(values) : 0;
        }
    });

    // ── Column display names ──────────────────────────────────────────────────
    const columnNames = {
        "KnowScience":         "How Much You Know About Science",
        "UnderstandScience":   "How Much You Understand the Meaning of Science and Scientists",
        "ConfidenceHospitals": "Confidence in Hospitals and Health Clinics",
        "TrustGovernment":     "Trust the National Government in This Country",
        "TrustScientists":     "Trust Scientists in This Country",
        "TrustDoctorsNurses":  "Trust Doctors and Nurses in This Country"
    };

    const shortLabels = {
        "KnowScience":         "Know Science",
        "UnderstandScience":   "Understand Science",
        "ConfidenceHospitals": "Hospital Confidence",
        "TrustGovernment":     "Trust Government",
        "TrustScientists":     "Trust Scientists",
        "TrustDoctorsNurses":  "Trust Doctors/Nurses"
    };

    const allCols = ["KnowScience", "UnderstandScience", "ConfidenceHospitals",
                     "TrustGovernment", "TrustScientists", "TrustDoctorsNurses"];

    // ── Populate dropdown ─────────────────────────────────────────────────────
    const startIndex = data.columns.indexOf("KnowScience");
    const endIndex   = data.columns.indexOf("TrustDoctorsNurses");
    const columns    = data.columns.slice(startIndex, endIndex + 1);

    const dropdown = d3.select("#dataSelector");
    dropdown.selectAll("option")
        .data(columns)
        .enter().append("option")
        .text(d => columnNames[d] || d.replace(/_/g, " "))
        .attr("value", d => d);

    // ── State ─────────────────────────────────────────────────────────────────
    let selectedColumn  = columns[0];
    let dataMap         = new Map(data.map(d => [d.country, +d[selectedColumn]]));
    let selectedCountry = null;

    const detailPanel = document.getElementById("detail-panel");

    // ── Initial global average ────────────────────────────────────────────────
    updateGlobalAvg();

    // ── Map group ─────────────────────────────────────────────────────────────
    const mapGroup = svg.append("g");

    // ── Country paths ─────────────────────────────────────────────────────────
    const countryPaths = mapGroup.selectAll("path")
        .data(countries.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", d => getColor(d.properties.name, selectedColumn))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.4)
        .on("mouseover", (event, d) => {
            const value = dataMap.get(d.properties.name);

            if (value === undefined) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top",  `${event.pageY - 10}px`)
                    .html(`
                        <div style="font-size:14px;font-weight:700;margin-bottom:3px;">${d.properties.name}</div>
                        <div style="color:#999;">No Data</div>
                    `)
                    .style("visibility", "visible");
                return;
            }

            const avg          = averages[selectedColumn] || 0;
            const roundedValue = Math.round(value);
            const diff         = Math.round(value - avg);
            const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;

            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top",  `${event.pageY - 10}px`)
                .html(`
                    <div style="font-size:14px;font-weight:700;margin-bottom:3px;">${d.properties.name}</div>
                    <div style="font-size:11px;color:#666;margin-bottom:5px;">${columnNames[selectedColumn] || selectedColumn.replace(/_/g, " ")}</div>
                    <div style="font-size:14px;font-weight:700;margin-bottom:2px;">${roundedValue}%</div>
                    <div style="font-size:11px;color:#888;">${formattedDiff} from global avg.</div>
                `)
                .style("visibility", "visible");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"))
        .on("click", (event, d) => {
            zoomToCountry(d);
            selectedCountry = d.properties.name;
            showDetailPanel(selectedCountry);
        });

    // ── Dropdown: question change ─────────────────────────────────────────────
    dropdown.on("change", function () {
        selectedColumn = this.value;
        dataMap = new Map(data.map(d => [d.country, +d[selectedColumn]]));

        countryPaths.transition().duration(500)
            .attr("fill", d => getColor(d.properties.name, selectedColumn));

        updateLegend(selectedColumn);
        updateGlobalAvg();

        if (selectedCountry && !detailPanel.classList.contains("hidden")) {
            showDetailPanel(selectedCountry);
        }
    });

    // ── Dropdown: view mode change ────────────────────────────────────────────
    viewSelector.addEventListener("change", () => {
        countryPaths.transition().duration(500)
            .attr("fill", d => getColor(d.properties.name, selectedColumn));

        updateLegend(selectedColumn);

        if (selectedCountry && !detailPanel.classList.contains("hidden")) {
            showDetailPanel(selectedCountry);
        }
    });

    // ── Initial legend ────────────────────────────────────────────────────────
    updateLegend(selectedColumn);

    // ── Search ────────────────────────────────────────────────────────────────
    const searchInput   = document.getElementById("countrySearch");
    const searchResultsDiv = document.getElementById("searchResults");

    searchInput.addEventListener("input", function () {
        const query = this.value.toLowerCase().trim();
        searchResultsDiv.innerHTML = "";

        if (!query) {
            searchResultsDiv.style.display = "none";
            return;
        }

        const matches = data
            .filter(d => d.country.toLowerCase().includes(query))
            .slice(0, 8);

        if (matches.length === 0) {
            searchResultsDiv.style.display = "none";
            return;
        }

        searchResultsDiv.style.display = "block";
        matches.forEach(match => {
            const div = document.createElement("div");
            div.className = "search-result-item";
            div.textContent = match.country;
            div.addEventListener("click", () => {
                searchInput.value = match.country;
                searchResultsDiv.style.display = "none";

                const feature = countries.features.find(f => f.properties.name === match.country);
                if (feature) zoomToCountry(feature);

                selectedCountry = match.country;
                showDetailPanel(selectedCountry);
            });
            searchResultsDiv.appendChild(div);
        });
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".search-input-wrap")) {
            searchResultsDiv.style.display = "none";
        }
    });

    // ── Close detail panel ────────────────────────────────────────────────────
    document.getElementById("close-panel").addEventListener("click", () => {
        detailPanel.classList.add("hidden");
    });

    // ── Detail panel ──────────────────────────────────────────────────────────
    function showDetailPanel(countryName) {
        const row = data.find(d => d.country === countryName);
        if (!row) return;

        document.getElementById("panel-country-name").textContent = countryName;
        document.getElementById("panel-region").textContent = row.region || "";

        // Rank for current question
        const sorted = data
            .filter(d => !isNaN(+d[selectedColumn]) && +d[selectedColumn] > 0)
            .sort((a, b) => +b[selectedColumn] - +a[selectedColumn]);
        const rank  = sorted.findIndex(d => d.country === countryName) + 1;
        const total = sorted.length;
        const rankEl = document.getElementById("panel-rank");
        rankEl.textContent = rank > 0
            ? `Ranked #${rank} of ${total} countries · ${columnNames[selectedColumn]}`
            : "No ranking data";

        // ── Bar chart ─────────────────────────────────────────────────────────
        const chartDiv = document.getElementById("panel-chart");
        chartDiv.innerHTML = "";

        const margin      = { top: 8, right: 58, bottom: 26, left: 148 };
        const barH        = 22;
        const rowH        = 34;
        const svgW        = 700;
        const svgH        = allCols.length * rowH + margin.top + margin.bottom;
        const barAreaW    = svgW - margin.left - margin.right;

        const xScale = d3.scaleLinear().domain([0, 100]).range([0, barAreaW]);

        const chartSvg = d3.select("#panel-chart").append("svg")
            .attr("viewBox", `0 0 ${svgW} ${svgH}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const g = chartSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Light x-axis gridlines at 25%, 50%, 75%
        [25, 50, 75].forEach(tick => {
            g.append("line")
                .attr("x1", xScale(tick)).attr("x2", xScale(tick))
                .attr("y1", 0).attr("y2", allCols.length * rowH - rowH + barH)
                .attr("stroke", "#dce3ec").attr("stroke-width", 1);
        });

        allCols.forEach((col, i) => {
            const y          = i * rowH;
            const value      = +row[col];
            const avg        = averages[col] || 0;
            const isSelected = col === selectedColumn;

            const rowG = g.append("g").attr("transform", `translate(0,${y})`);

            // Track
            rowG.append("rect")
                .attr("width", barAreaW).attr("height", barH)
                .attr("fill", "#eef2f7").attr("rx", 3);

            // Value bar
            if (!isNaN(value) && value > 0) {
                rowG.append("rect")
                    .attr("width", xScale(value)).attr("height", barH)
                    .attr("fill", isSelected ? "#00356b" : "#4a7fa8")
                    .attr("rx", 3)
                    .attr("opacity", isSelected ? 1 : 0.65);
            }

            // Global average tick
            rowG.append("line")
                .attr("x1", xScale(avg)).attr("x2", xScale(avg))
                .attr("y1", -2).attr("y2", barH + 2)
                .attr("stroke", "#c4820a")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4,3");

            // Label
            rowG.append("text")
                .attr("x", -8).attr("y", barH / 2)
                .attr("text-anchor", "end")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "11.5px")
                .attr("font-family", "Open Sans, sans-serif")
                .attr("fill", isSelected ? "#00356b" : "#444")
                .attr("font-weight", isSelected ? "600" : "400")
                .text(shortLabels[col]);

            // Value label
            if (!isNaN(value) && value > 0) {
                rowG.append("text")
                    .attr("x", xScale(value) + 5).attr("y", barH / 2)
                    .attr("dominant-baseline", "middle")
                    .attr("font-size", "11px")
                    .attr("font-family", "Open Sans, sans-serif")
                    .attr("fill", "#333")
                    .text(`${Math.round(value)}%`);
            } else {
                rowG.append("text")
                    .attr("x", 5).attr("y", barH / 2)
                    .attr("dominant-baseline", "middle")
                    .attr("font-size", "10px")
                    .attr("font-family", "Open Sans, sans-serif")
                    .attr("fill", "#aaa")
                    .text("No data");
            }
        });

        // Avg-line legend (bottom left of chart)
        const legendY = svgH - 10;
        chartSvg.append("line")
            .attr("x1", margin.left).attr("x2", margin.left + 18)
            .attr("y1", legendY).attr("y2", legendY)
            .attr("stroke", "#c4820a").attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,3");
        chartSvg.append("text")
            .attr("x", margin.left + 22).attr("y", legendY)
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", "#888")
            .text("Global average");

        detailPanel.classList.remove("hidden");
        detailPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // ── getColor ──────────────────────────────────────────────────────────────
    function getColor(country, variable) {
        const value = dataMap.get(country);
        const avg   = averages[variable] || 0;

        if (value === undefined || isNaN(value)) return "#ededed";

        if (viewSelector.value === "absolute") {
            return value < 30 ? categoricalColors[0] :
                   value < 40 ? categoricalColors[1] :
                   value < 50 ? categoricalColors[2] :
                   value < 60 ? categoricalColors[3] :
                   value < 70 ? categoricalColors[4] : categoricalColors[5];
        } else {
            const diff = Math.round(value - avg);
            return diff < -20 ? diffColorBins[0] :
                   diff < -15 ? diffColorBins[1] :
                   diff < -10 ? diffColorBins[2] :
                   diff <  -5 ? diffColorBins[3] :
                   diff <   0 ? diffColorBins[4] :
                   diff <   5 ? diffColorBins[5] :
                   diff <  10 ? diffColorBins[6] :
                   diff <  15 ? diffColorBins[7] :
                   diff <  20 ? diffColorBins[8] : diffColorBins[9];
        }
    }

    // ── updateLegend ──────────────────────────────────────────────────────────
    function updateLegend(variable) {
        legendDiv.html("");

        let colorScale, labels, title;

        if (viewSelector.value === "absolute") {
            colorScale = categoricalColors.slice().reverse();
            labels     = ["<30%", "30–40%", "40–50%", "50–60%", "60–70%", ">70%"].reverse();
            title      = "% of respondents";
        } else {
            colorScale = diffColorBins.slice().reverse();
            labels     = ["<−20", "−20 to −15", "−15 to −10", "−10 to −5", "−5 to 0",
                          "0 to +5", "+5 to +10", "+10 to +15", "+15 to +20", ">+20"].reverse();
            title      = "Diff. from global avg. (pp)";
        }

        legendDiv.append("div")
            .attr("id", "legend-title")
            .text(title);

        colorScale.forEach((color, i) => {
            legendDiv.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("margin-bottom", "4px")
                .html(`
                    <div style="width:13px;height:13px;background:${color};
                                margin-right:7px;border:1px solid rgba(0,0,0,0.15);
                                border-radius:2px;flex-shrink:0;"></div>
                    <span style="font-size:11.5px;font-family:'Open Sans',sans-serif;
                                 white-space:nowrap;color:#333;">${labels[i]}</span>
                `);
        });

        // No data entry
        legendDiv.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-top", "7px")
            .style("padding-top", "6px")
            .style("border-top", "1px solid #dce3ec")
            .html(`
                <div style="width:13px;height:13px;background:#ededed;
                            margin-right:7px;border:1px solid rgba(0,0,0,0.15);
                            border-radius:2px;flex-shrink:0;"></div>
                <span style="font-size:11.5px;font-family:'Open Sans',sans-serif;
                             color:#aaa;">No data</span>
            `);
    }

    // ── updateGlobalAvg ───────────────────────────────────────────────────────
    function updateGlobalAvg() {
        const avg = Math.round(averages[selectedColumn]) || 0;
        document.getElementById("globalAverage").innerHTML =
            `<strong>Global Avg.:</strong> ${avg}%`;
    }

    // ── Zoom to country ───────────────────────────────────────────────────────
    function zoomToCountry(d) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        const newScale = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
        const newX = (x0 + x1) / 2;
        const newY = (y0 + y1) / 2;

        svg.interrupt();
        svg.transition()
            .duration(1200)
            .ease(d3.easeCubicInOut)
            .call(zoom.transform, d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(newScale)
                .translate(-newX, -newY)
            );
    }

    // ── Zoom behaviour ────────────────────────────────────────────────────────
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", function (event) {
            const { x, y, k } = event.transform;
            if (k === 1) {
                mapGroup.transition().duration(500).ease(d3.easeCubicInOut)
                    .attr("transform", "translate(0,0) scale(1)");
                detailPanel.classList.add("hidden");
                selectedCountry = null;
            } else {
                mapGroup.attr("transform", `translate(${x},${y}) scale(${k})`);
            }
        });

    svg.call(zoom);

    document.getElementById("resetZoom").addEventListener("click", () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        detailPanel.classList.add("hidden");
        selectedCountry = null;
    });

    window.addEventListener("resize", () => {
        svg.attr("width", width).attr("height", height);
        projection.scale(width / 5).translate([width / 2, height / 2]);
        svg.selectAll("path").attr("d", path);
    });

});
