// I asked ChatGPT for a random color generator
function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
    const lightness = 45 + Math.floor(Math.random() * 10);  // 45-55%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Hold all the selected bin items
const selectedCategories = new Map();

// Code made using Lab 2 Script
d3.csv("gym_members_exercise_tracking.csv").then(function(data) {
    // Define variables
    const numericalVariables = ['Age', 'Weight (kg)', 'Height (m)', 'Max_BPM', 'Avg_BPM', 'Resting_BPM', 'Session_Duration (hours)', 'Calories_Burned', 'Fat_Percentage', 'Water_Intake (liters)', 'Workout_Frequency (days/week)', 'Experience_Level', 'BMI'];
    const categoricalVariables = ['Gender', 'Workout_Type'];
    const allVariables = [...numericalVariables, ...categoricalVariables];
    var val = "";

    populateSelect("#variable-select", allVariables);

    const initialMode = d3.select("input[name='display-mode']:checked").property("value");
    updateDisplayMode(initialMode);

    d3.selectAll("input[name='display-mode']").on("change", function() {
        const mode = this.value;
        updateDisplayMode(mode);
    });

    d3.select("#variable-select").on("change", updateChart);

    // Asked Claude how to change from one display to another with Radio Buttons
    function updateDisplayMode(mode) {
        // Hide all display modes first
        d3.selectAll(".display-mode").style("display", "none");

        // Show the appropriate display mode
        if (mode === "select") {
            d3.select("#select-display").style("display", "block");
            d3.select("#variable-select").style("display", "block");
        } else {
            d3.select("#select-display").style("display", "none");
            d3.select("#variable-select").style("display", "none");
            
        }
        d3.select("#visualization").html("");
        updateChart();
        updateHighlights(data);
    }

    function populateSelect(selectId, variables) {
        const select = d3.select(selectId);
        select.selectAll("option")
            .data(['Select Variable', ...variables])
            .enter()
            .append("option")
            .text(d => d)
            .attr("value", d => d === 'Select Variable' ? '' : d);
    }

    function updateChart() {
        d3.select("#visualization").selectAll("*").remove();

        const firstVariable = d3.select("#variable-select").property("value");
        const selectedMode = d3.select('input[name="display-mode"]:checked').property("value");
        if (selectedMode == "select" && firstVariable) {
            if(val==""){
                val=firstVariable;
            } else{
                if(val!=firstVariable){
                    selectedCategories.clear();
                    updateHighlights();
                    val=firstVariable;
                }
            }
            createBarChart(firstVariable);
            drawBiplot();
            drawMDSdata();
            drawParallelCoordinates();
        } else {
            drawBiplot();
            drawMDSdata();
            drawParallelCoordinates();
        }
    }
    // Lab 2
    function createBarChart(variable) {
        const isNumerical = numericalVariables.includes(variable);
        let processedData;
        let name;
        if (isNumerical) {
            const histogram = d3.histogram()
                .value(d => +d[variable])
                .domain(d3.extent(data, d => +d[variable]))
                .thresholds(10);
            processedData = histogram(data);
            name = "Histogram";
        } else {
            const counts = d3.rollup(data, v => v.length, d => d[variable]);
            processedData = Array.from(counts, ([key, value]) => ({ key, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
            name = "Bar Chart";
        }
        const margin = { top: 20, right: 30, bottom: 85, left: 65 };
        const width = 800;
        const height = 500;

        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = isNumerical ? d3.scaleLinear().domain([processedData[0].x0, processedData[processedData.length - 1].x1]).range([0, width]) 
            : d3.scaleBand().domain(processedData.map(d => d.key)).range([0, width]).padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => isNumerical ? d.length : d.value)])
            .range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-35)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y));

        // Asked Claude how to create a clickable Bar Chart / Histogram and connect it to the other charts
        svg.selectAll("rect")
            .data(processedData)
            .enter()
            .append("rect")
            .attr("x", d => isNumerical ? x(d.x0) : x(d.key))
            .attr("y", d => y(isNumerical ? d.length : d.value))
            .attr("width", d => isNumerical ? x(d.x1) - x(d.x0) : x.bandwidth())
            .attr("height", d => height - y(isNumerical ? d.length : d.value))
            .attr("fill", d => {
                const category = isNumerical ? `${d.x0}-${d.x1}` : d.key;
                return selectedCategories.has(category) ? selectedCategories.get(category).color : "#000000";
            })
            .on("click", function(event, d) {
                const category = isNumerical ? `${d.x0}-${d.x1}` : d.key;
                
                if (selectedCategories.has(category)) {
                    // Deselect if already selected
                    selectedCategories.delete(category);
                    d3.select(this).attr("fill", "#000000");
                } else {
                    // Select and assign random color
                    const color = generateRandomColor();
                    selectedCategories.set(category, {
                        color: color,
                        range: isNumerical ? [d.x0, d.x1] : d.key,
                        variable: variable,
                        isNumerical: isNumerical
                    });
                    d3.select(this).attr("fill", color);
                }
                updateHighlights(data);
            });

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .text(name);

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text("Frequency");
    }

    // lab 3
    async function drawBiplot() {
        // dimensions
        const margin = {top: 40, right: 40, bottom: 60, left: 60};
        const width = 1000 - margin.left - margin.right;
        const height = 1000 - margin.top - margin.bottom;
        const axisLimit = 5; 

        // make graph
        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // load
        d3.json("biplot_data.json").then(data => {
            const pcaCoords = data.pca_coords;
            const loadings = data.loadings;
            const variables = data.column_names;

            // scales
            const xScale = d3.scaleLinear().domain([-axisLimit, axisLimit]).range([0, width]);
            const yScale = d3.scaleLinear().domain([-axisLimit, axisLimit]).range([height, 0]);

            // axes
            const xAxis = d3.axisBottom(xScale).tickSize(-5).ticks(10); 
            const yAxis = d3.axisLeft(yScale).tickSize(5).ticks(10);

            // Append X axis in the center (Asked Chatgpt how to make axes from the center and used their template)
            svg.append("g")
                .attr("transform", `translate(0,${yScale(0)})`) // Move the axis to the y=0 line
                .call(xAxis)
                .selectAll("text")
                .attr("dy", "-1.5em"); // Adjust text position

            // Append Y axis in the center
            svg.append("g")
                .attr("transform", `translate(${xScale(0)},0)`) // Move the axis to the x=0 line
                .call(yAxis)
                .selectAll("text")
                .attr("dx", "-0.5em"); // Adjust text position

            // points
            svg.selectAll("circle")
                .data(pcaCoords)
                .enter()
                .append("circle")
                .attr("class", "point biplot-point")  // Add specific class
                .attr("cx", d => xScale(d[0]))
                .attr("cy", d => yScale(d[1]))
                .attr("r", 3)
                .attr("fill", "#000000");

            // x axis label 
            svg.append("text")
                .attr("class", "axis-label")
                .attr("x", width / 2)
                .attr("y", height + 40)
                .style("text-anchor", "middle")
                .style("fill", "#000000")
                .text("First Principal Component");

            // y axis label
            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -45) 
                .style("text-anchor", "middle")
                .style("fill", "#000000")
                .text("Second Principal Component");

            const scaleFactor = 1; // Adjust to fine-tune loadings
            loadings.forEach((loading, i) => { 
                const x2 = loading[0] * scaleFactor * axisLimit;
                const y2 = loading[1] * scaleFactor * axisLimit;

                // Draw axis line
                svg.append("line")
                    .attr("class", "axis-line")
                    .attr("x1", xScale(0))
                    .attr("y1", yScale(0))
                    .attr("x2", xScale(x2))
                    .attr("y2", yScale(y2))

                // Add axis label
                const labelX = xScale(x2 * 1.1);
                const labelY = yScale(y2 * 1.1);

                svg.append("text")
                    .attr("class", "axis-label")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .style("text-anchor", "middle")
                    .text(variables[i]);
            });
        });
    }

    // Checks if data point is part of the selected bin
    function checkDataPoint(dataPoint, category) {
        if (!dataPoint || !category) return false;
    
        if (category.isNumerical) {
            const value = +dataPoint[category.variable];
            return !isNaN(value) && value >= category.range[0] && value < category.range[1];
        } else {
            return dataPoint[category.variable] === category.range;
        }
    }

    // Updates the color for each display (Created from Claude, added on to create coloring MDS and for K-means Clustering)
    function updateHighlights(originalData) {
        // Load the necessary data first
        Promise.all([
            d3.json("biplot_data.json"),
            d3.json("mds_data.json"),
            d3.json("parallel_coordinates_data.json"),
            d3.json("cluster_data.json")
        ]).then(([biplotData, mdsData, parallelData, cluster_data]) => {
            // Color by Bin
            if (d3.select('input[name="display-mode"]:checked').property("value") === "select") {
                // Update biplot points
                d3.selectAll("#visualization .point").attr("fill", function(d, i) {
                    // Match the index with original data 
                    const dataPoint = originalData[i];
                    if (!dataPoint) return "#000000";
                    
                    for (let [_, category] of selectedCategories) {
                        if (checkDataPoint(dataPoint, category)) {
                            return category.color;
                        }
                    }
                    return "#000000";
                });
                // mds points
                d3.selectAll('.point.mds-point').attr("fill", function(d, i) {
                    const dataPoint = originalData[i];
                    if (!dataPoint) return "#000000";
                    
                    for (let [_, category] of selectedCategories) {
                        if (checkDataPoint(dataPoint, category)) {
                            return category.color;
                        }
                    }
                    return "#000000";
                });
                // Update parallel coordinates
                d3.selectAll(".foreground path").style("stroke", function(d) {
                    if (!d) return "#000000";
                    
                    for (let [_, category] of selectedCategories) {
                        if (checkDataPoint(d, category)) {
                            return category.color;
                        }
                    }
                    return "#000000";
                });
            } else if (d3.select('input[name="display-mode"]:checked').property("value") === "cluster") {
                const k = cluster_data["k"];
                const clusterValues = cluster_data["data"];
                const colors = Array.from({ length: k }, () => generateRandomColor());
                // Update biplot points
                d3.selectAll("#visualization .point").attr("fill", function(d, i) {
                    console.log(i);
                    // Match the index with original data 
                    const dataPoint = originalData[i];
                    if (!dataPoint) return "#000000";
                    return colors[clusterValues[i]];
                });
                // mds points
                d3.selectAll('.point.mds-point').attr("fill", function(d, i) {
                    console.log(i);
                    const dataPoint = originalData[i];
                    if (!dataPoint) return "#000000";
                    return colors[clusterValues[i]];
                });
                // Update parallel coordinates
                d3.selectAll(".foreground path").style("stroke", function(d,i) {
                    console.log(i);
                    if (!d) return "#000000";
                    return colors[clusterValues[i]];
                });
            }
        });
    }

    // Lab 3
    async function drawMDSdata() {
        // dimensions
        const margin = {top: 40, right: 40, bottom: 40, left: 60};
        const width = 1000 - margin.left - margin.right;
        const height = 800 - margin.top - margin.bottom;

        // create graph
        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // load
        d3.json("mds_data.json").then(data => {
            const mdsCoords = data.mds_data;

            // scales
            const xExtent = d3.extent(mdsCoords, d => d[0]);
            const yExtent = d3.extent(mdsCoords, d => d[1]);
            const padding = 0.1;

            const xScale = d3.scaleLinear()
                .domain([xExtent[0] * (1 + padding), xExtent[1] * (1 + padding)])
                .range([0, width]);

            const yScale = d3.scaleLinear()
                .domain([yExtent[0] * (1 + padding), yExtent[1] * (1 + padding)])
                .range([height, 0]);

            // axes
            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(xAxis);

            svg.append("g")
                .call(yAxis);

            // axis labels
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 35)
                .style("text-anchor", "middle")
                .text("MDS Dimension 1");

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -45)
                .style("text-anchor", "middle")
                .text("MDS Dimension 2");

            // title
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -10)
                .style("text-anchor", "middle")
                .style("font-size", "16px")
                .text("MDS Plot of Data Points");

            // points
            svg.selectAll("circle")
                .data(mdsCoords)
                .enter()
                .append("circle")
                .attr("class", "point mds-point")  // Add specific class
                .attr("cx", d => xScale(d[0]))
                .attr("cy", d => yScale(d[1]))
                .attr("r", 3)
                .attr("fill", "#000000");
        });
    }

    async function drawParallelCoordinates() {
        // load the data
        const data = await d3.json('parallel_coordinates_data.json');
        const corr = data.corr;
        const values = data.data;
        const cata = data.cata;
        const variables = data.column_names;

        const total_data = []
        // combine Numerical & Catagorical Data
        for (let i = 0; i < values.length; i++) {
            total_data[i] = Object.assign({}, values[i], cata[i]);
        }
        const corr_arr = [];
        for (let i = 0; i < variables.length-2; i++) {
            corr_arr[i] = Object.keys(corr[i]).map(function(key){
                return corr[i][key];
            });
        }
        const cata_arr = [];
        const values_arr = [];
        for (let i = 0; i < values.length; i++) {
            values_arr[i] = Object.keys(values[i]).map(function(key){
                return values[i][key];
            });
            cata_arr[i] = Object.keys(cata[i]).map(function(key){
                return cata[i][key];
            });
        }

        // dimensions
        const margin = {top: 30, right: 50, bottom: 30, left: 50};
        const width = 1200 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        // 1: create a distance matrix using the correlation data
        const numericalVariables = variables.slice(0,variables.length-2);  // only numeric variables for TSP
        const distMatrix = new Array(numericalVariables.length);
        for (let i = 0; i < numericalVariables.length; i++) {
            distMatrix[i] = new Array(numericalVariables.length);
            for (let j = 0; j < variables.length; j++) {
                distMatrix[i][j] = Math.abs(1 - corr_arr[i][j]);  // distance = 1 - correlation
            }
        }

        // 2: TSP solver
        function tspSolver(distMatrix) {
            const n = distMatrix.length;
            const visited = new Array(n).fill(false);
            const result = [0]; // Start from the first node
            visited[0] = true;

            function findNextNode(currNode) {
                let minDist = Infinity;
                let nextNode = -1;
                for (let i = 0; i < n; i++) {
                    if (!visited[i] && distMatrix[currNode][i] < minDist) {
                        minDist = distMatrix[currNode][i];
                        nextNode = i;
                    }
                }
                return nextNode;
            }

            for (let i = 1; i < n; i++) {
                const currNode = result[result.length - 1];
                const nextNode = findNextNode(currNode);
                result.push(nextNode);
                visited[nextNode] = true;
            }
            return result;
        }

        // 3: TSP order for numerical variables
        const tspOrder = tspSolver(distMatrix);

        const optimizedDimensions = tspOrder.map(index => variables[index]);

        // add catagorical variables after
        optimizedDimensions.push(variables[variables.length-2], variables[variables.length-1]);

        // scales
        const y = {};
        optimizedDimensions.forEach(dim => {
            if (dim === variables[variables.length-2] || dim === variables[variables.length-1]) {
                // Ordinal scale for categorical variables
                const categories = Array.from(new Set(cata.map(d => d[dim])));
                y[dim] = d3.scalePoint()
                    .domain(categories)
                    .range([height, 0]);
            } else {
                // Linear scale for numeric variables
                y[dim] = d3.scaleLinear()
                    .domain(d3.extent(values, d => d[dim]))
                    .range([height, 0]);
            }
        });

        // pos axis
        const x = d3.scalePoint()
            .domain(optimizedDimensions)
            .range([0, width]);

        // create graph
        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Update foreground lines
        const foreground = svg.append("g")
            .attr("class", "foreground")
            .selectAll("path")
            .data(total_data)
            .enter()
            .append("path")
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#000")
            .style("stroke-width", "1px");

        // group element
        const g = svg.selectAll(".dimension")
            .data(optimizedDimensions)
            .enter()
            .append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${x(d)})`);

        // axes and titles
        g.append("g")
            .attr("class", "axis")
            .each(function(d) {
                if (d === 'category1' || d === 'category2') {
                    d3.select(this).call(d3.axisLeft(y[d]).ticks(values.length));
                } else {
                    d3.select(this).call(d3.axisLeft(y[d]));
                }
            })
            .append("text")
            .attr("y", -9)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text(d => d);
        // Returns the path for a given data point (template from Chatgpt for creating the path)
        function path(d) {
            return d3.line()(optimizedDimensions.map(p => [x(p), y[p](d[p])]));
        }
    }
});