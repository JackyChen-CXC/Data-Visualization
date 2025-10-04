d3.csv("gym_members_exercise_tracking.csv").then(function(data) {
    const numericalVariables = ['Age', 'Weight (kg)', 'Height (m)', 'Max_BPM', 'Avg_BPM', 'Resting_BPM', 'Session_Duration (hours)', 'Calories_Burned', 'Fat_Percentage', 'Water_Intake (liters)', 'BMI'];
    const categoricalVariables = ['Gender', 'Experience_Level','Workout_Frequency (days/week)','Workout_Type'];
    const ordinalVariables = ['Experience_Level','Workout_Frequency (days/week)']
    const allVariables = [...numericalVariables, ...categoricalVariables];

    // Utility function from Claude for formatting margins and dimensions 
    function setupChartDimensions(selector) {
        const container = d3.select(selector);
        const margin = {top: 20, right: 20, bottom: 100, left: 50};
        const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
        const height = container.node().getBoundingClientRect().height - margin.top - margin.bottom;
        
        return { margin, width, height };
    }

    // first select interaction category
    const categoriesDropdown = d3.select("#categories-dropdown")
        .on("change", function () {
            updateHistogramChart();
            updateAreaChart();
            createHeatmap();
            createBiplot();
        });
    
    // second select interaction category
    const variablesDropdown2 = d3.select("#variables-dropdown-2")
        .on("change", function () {
            updateAreaChart();
            createHeatmap();
        });
    
    // create dropdowns
    categoriesDropdown.selectAll("option")
        .data(allVariables)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
    [variablesDropdown2].forEach(dropdown => {
        dropdown.selectAll("option")
            .data(allVariables)
            .enter()
            .append("option")
            .text(d => d)
            .attr("value", d => d);
    });

    function clearChart(container) {
        d3.select(container).selectAll("*").remove();
    }
    
    // Store bins globally to share between histogram and area chart
    let globalBins = null;
    let globalColor = null;

    // Modified Lab 4 code using ChatGPT to autoselect unique colors and Binning
    function updateHistogramChart() {
        const selectedCategory = d3.select("#categories-dropdown").node().value;
        clearChart("#type-chart");
        // Reset global variables
        globalBins = null;
        globalColor = null;

        if (selectedCategory == '') {
            d3.select("#type-chart").append("h3").text('Histogram / Bar Chart');
            return;
        }

        const isNumerical = numericalVariables.includes(selectedCategory);
    
        d3.select("#type-chart").append("h3").text(`Distribution of ${selectedCategory}`);
    
        const svg = d3.select("#type-chart")
            .append("svg")
            .attr("width", 600)
            .attr("height", 400);
    
        const selector = '#type-chart';
        const { margin, width, height } = setupChartDimensions(selector);
    
        if (isNumerical) {
            const x = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[selectedCategory]))
                .range([margin.left, width + margin.left]);
    
            const histogram = d3.histogram()
                .value(d => +d[selectedCategory])
                .domain(x.domain())
                .thresholds(x.ticks(20));
    
            const bins = histogram(data);
            globalBins = bins; // Store bins globally
    
            const y = d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)])
                .range([height, margin.top]);
    
            globalColor = d3.scaleOrdinal()
                .domain(bins.map((_, i) => i)) 
                .range(d3.schemeCategory10.concat(d3.schemePaired, d3.schemeSet3));
    
            svg.selectAll('rect')
                .data(bins)
                .enter()
                .append('rect')
                .attr('x', d => x(d.x0) + 1)
                .attr('transform', d => `translate(0, ${y(d.length)})`)
                .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
                .attr('height', d => height - y(d.length))
                .style('fill', (d, i) => globalColor(i))
                .style('opacity', 0.7);
    
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));
    
            svg.append('g')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));
        } else {
            // Handle ordinal and unordered categorical variables
            let categoryCounts;
            if (ordinalVariables.includes(selectedCategory)) {
                // Sort ordinal categories
                categoryCounts = d3.rollups(
                    data,
                    v => v.length,
                    d => d[selectedCategory]
                ).sort((a, b) => +a[0] - +b[0]);
            } else {
                // Default: unordered categorical
                categoryCounts = d3.rollups(
                    data,
                    v => v.length,
                    d => d[selectedCategory]
                ).sort((a, b) => b[1] - a[1]);
            }
    
            const x = d3.scaleBand()
                .domain(categoryCounts.map(d => d[0]))
                .range([margin.left, width + margin.left])
                .padding(0.1);
    
            const y = d3.scaleLinear()
                .domain([0, d3.max(categoryCounts, d => d[1])])
                .range([height, margin.top]);
    
            globalColor = d3.scaleOrdinal()
                .domain(categoryCounts.map((_, i) => i))
                .range(d3.schemeCategory10.concat(d3.schemePaired, d3.schemeSet3));
    
            svg.selectAll('.bar')
                .data(categoryCounts)
                .enter().append('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d[0]))
                .attr('width', x.bandwidth())
                .attr('y', d => y(d[1]))
                .attr('height', d => height - y(d[1]))
                .attr('fill', (d, i) => globalColor(i));
    
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));
    
            svg.append('g')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));
        }
    }    

    // Frequency Area Chart made with the help of ChatGPT on Coloring and Binning
    function updateAreaChart() {
        const var1 = d3.select("#categories-dropdown").node().value;
        const var2 = d3.select("#variables-dropdown-2").node().value;
    
        clearChart("#area-chart");
    
        if (var1 == '' || var2 == '') {
            d3.select("#area-chart").append("h3").text('Area Chart');
            return;
        }
        d3.select("#area-chart").append("h3").text(`${var1} vs ${var2}`);
    
        const selector = '#area-chart';
        const { margin, width, height } = setupChartDimensions(selector);
    
        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    
        if (numericalVariables.includes(var1) && numericalVariables.includes(var2)) {
            if (!globalBins) {
                console.error("Global bins not available");
                return;
            }
            
            const var2Extent = d3.extent(data, d => +d[var2]);
            const xBinCount = 10;
            const x = d3.scaleLinear()
                .domain(var2Extent)
                .range([0, width]);
    
            const xHistogram = d3.histogram()
                .value(d => +d[var2])
                .domain(x.domain())
                .thresholds(x.ticks(xBinCount));
    
            const xBins = xHistogram(data);
    
            const y = d3.scaleLinear()
                .domain([0, d3.max(globalBins, bin => 
                    xBins.reduce((maxCount, xBin) => {
                        const count = data.filter(d => 
                            +d[var1] >= bin.x0 && +d[var1] < bin.x1 &&
                            +d[var2] >= xBin.x0 && +d[var2] < xBin.x1
                        ).length;
                        return Math.max(maxCount, count);
                    }, 0)
                )])
                .range([height, 0]);
    
            const area = d3.area()
                .x((d, i) => x(xBins[i].x0) + (x(xBins[i].x1) - x(xBins[i].x0)) / 2)
                .y0(height)
                .y1(d => y(d));
    
            globalBins.forEach((bin, index) => {
                const binFrequencies = xBins.map(xBin => 
                    data.filter(d => 
                        +d[var1] >= bin.x0 && +d[var1] < bin.x1 &&
                        +d[var2] >= xBin.x0 && +d[var2] < xBin.x1
                    ).length
                );
    
                svg.append('path')
                    .datum(binFrequencies)
                    .attr('fill', globalColor(index))
                    .attr('opacity', 0.5)
                    .attr('d', area);
            });
    
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x));
    
            svg.append('g').call(d3.axisLeft(y));
    
        } else {
            console.log("Categorical variable handling");
    
            if (numericalVariables.includes(var2)) {
                const var2Extent = d3.extent(data, d => +d[var2]);
                const xBinCount = 10;
                const x = d3.scaleLinear()
                    .domain(var2Extent)
                    .range([0, width]);
    
                const xHistogram = d3.histogram()
                    .value(d => +d[var2])
                    .domain(x.domain())
                    .thresholds(x.ticks(xBinCount));
    
                const xBins = xHistogram(data);
    
                const var1Values = [...new Set(data.map(d => d[var1]))];
                const maxCount = d3.max(var1Values, category => 
                    d3.max(xBins, xBin => 
                        data.filter(d => d[var1] === category && +d[var2] >= xBin.x0 && +d[var2] < xBin.x1).length
                    )
                );
    
                const y = d3.scaleLinear()
                    .domain([0, maxCount])
                    .range([height, 0]);
    
                const color = d3.scaleOrdinal(d3.schemeCategory10);
    
                var1Values.forEach((category, index) => {
                    const binFrequencies = xBins.map(xBin => 
                        data.filter(d => d[var1] === category && +d[var2] >= xBin.x0 && +d[var2] < xBin.x1).length
                    );
    
                    const area = d3.area()
                        .x((d, i) => x(xBins[i].x0) + (x(xBins[i].x1) - x(xBins[i].x0)) / 2)
                        .y0(height)
                        .y1(d => y(d));
    
                    svg.append('path')
                        .datum(binFrequencies)
                        .attr('fill', color(index))
                        .attr('opacity', 0.55)
                        .attr('d', area);
                });
    
                svg.append('g')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x));
    
                svg.append('g').call(d3.axisLeft(y));
    
            } else {
                const var1Values = [...new Set(data.map(d => d[var1]))];
                const var2Values = [...new Set(data.map(d => d[var2]))];
    
                const frequencyData = var1Values.map(category => ({
                    category,
                    frequencies: var2Values.map(subCategory => ({
                        subCategory,
                        count: data.filter(d => d[var1] === category && d[var2] === subCategory).length
                    }))
                }));
    
                const x = d3.scaleBand()
                    .domain(var2Values)
                    .range([0, width])
                    .padding(0.1);
    
                const maxCount = d3.max(frequencyData, d => d3.max(d.frequencies, f => f.count));
                const y = d3.scaleLinear()
                    .domain([0, maxCount])
                    .range([height, 0]);
    
                const color = d3.scaleOrdinal(d3.schemeCategory10);
    
                frequencyData.forEach((group, index) => {
                    const area = d3.area()
                        .x(d => x(d.subCategory) + x.bandwidth() / 2)
                        .y0(height)
                        .y1(d => y(d.count));
    
                    svg.append('path')
                        .datum(group.frequencies)
                        .attr('fill', color(index))
                        .attr('opacity', 0.55)
                        .attr('d', area);
                });
    
                svg.append('g')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x))
                    .selectAll('text')
                    .attr('transform', 'rotate(-45)')
                    .style('text-anchor', 'end');
    
                svg.append('g').call(d3.axisLeft(y));
            }
        }
    }

    // Lab 4 code revised for a mixed use of the K-Means Clustering and selection coloring code
    function createBiplot() {
        const selectedCategory = d3.select("#categories-dropdown").node().value;
        const selector = '#biplot';
        const { margin, width, height } = setupChartDimensions(selector);
        const axisLimit = 5;

        clearChart("#biplot");
        d3.select("#biplot").append("h3").text('Biplot Analysis');

        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear().domain([-axisLimit, axisLimit]).range([0, width]);
        const yScale = d3.scaleLinear().domain([-axisLimit, axisLimit]).range([height, 0]);
    
        const xAxis = d3.axisBottom(xScale).tickSize(-5).ticks(10);
        const yAxis = d3.axisLeft(yScale).tickSize(5).ticks(10);
    
        // Append X axis in the center
        svg.append("g")
            .attr("transform", `translate(0,${yScale(0)})`)
            .call(xAxis)
            .selectAll("text")
            .attr("dy", "-1.5em");
    
        // Append Y axis in the center
        svg.append("g")
            .attr("transform", `translate(${xScale(0)},0)`)
            .call(yAxis)
            .selectAll("text")
            .attr("dx", "-0.5em");
    
        // X axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .style("text-anchor", "middle")
            .text("First Principal Component");
    
        // Y axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -25)
            .style("text-anchor", "middle")
            .text("Second Principal Component");
    
        let pointColors;
        if (selectedCategory === '') {
            pointColors = () => 'black';
        } else if (numericalVariables.includes(selectedCategory)) {
            const selectedData = data.map(d => +d[selectedCategory]);
            const binGenerator = d3.histogram()
                .domain(d3.extent(selectedData))
                .thresholds(10);
            const bins = binGenerator(selectedData);
    
            pointColors = d => {
                const value = +d[selectedCategory];
                const binIndex = bins.findIndex(bin => 
                    value >= bin.x0 && value < bin.x1
                );
                return binIndex !== -1 ? globalColor(binIndex) : 'black';
            };
        } else {
            const uniqueCategories = [...new Set(data.map(d => d[selectedCategory]))];
            const categoryColorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
            pointColors = d => {
                const category = d[selectedCategory];
                const categoryIndex = uniqueCategories.indexOf(category);
                return categoryColorScale(categoryIndex);
            };
        }
        // biplot_data.json from Lab 4 (unchanged JSON file)
        d3.json("biplot_data.json").then(biplot_data => {
            const pcaCoords = biplot_data.pca_coords;
            const loadings = biplot_data.loadings;
            const variables = biplot_data.column_names;
    
            svg.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("class", "point biplot-point")
                .attr("cx", (d, i) => xScale(pcaCoords[i][0]))
                .attr("cy", (d, i) => yScale(pcaCoords[i][1]))
                .attr("r", 5)
                .attr("fill", pointColors)
                .attr("opacity", 0.5);
            
            // asked Claude to fine-tune / make pretty my variable arrows
            const scaleFactor = 5;
            loadings.forEach((loading, i) => {
                const x2 = loading[0] * scaleFactor;
                const y2 = loading[1] * scaleFactor;
            
                svg.append("line")
                    .attr("class", "loading-vector")
                    .attr("x1", xScale(0))
                    .attr("y1", yScale(0))
                    .attr("x2", xScale(x2))
                    .attr("y2", yScale(y2))
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1.5)
                    .attr("marker-end", "url(#arrowhead)");
            
                const labelX = xScale(x2 * 1.1);
                const labelY = yScale(y2 * 1.1);
                svg.append("text")
                    .attr("class", "axis-label")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .style("text-anchor", "middle")
                    .text(variables[i])
                    .attr('font-size', '10px');
            });
            
            svg.append("defs")
                .append("marker")
                .attr("id", "arrowhead")
                .attr("markerWidth", 10)
                .attr("markerHeight", 7)
                .attr("refX", 0)
                .attr("refY", 3.5)
                .attr("orient", "auto")
                .append("polygon")
                .attr("points", "0 0, 10 3.5, 0 7");
        }).catch(error => {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("Error loading biplot data");
        });
    }

    // Lab 3 Correlation Matrix code modified for use in correlating the intersection between selected category bins
    function createHeatmap() {
        const var1 = d3.select("#categories-dropdown").node().value;
        const var2 = d3.select("#variables-dropdown-2").node().value;
    
        clearChart("#heatmap");
    
        if (var1 == '' || var2 == '') {
            d3.select("#heatmap").append("h3").text('Heatmap');
            return;
        }
    
        d3.select("#heatmap").append("h3").text(`Correlation: ${var1} vs ${var2}`);
    
        const selector = '#heatmap';
        const { margin, width, height } = setupChartDimensions(selector);
    
        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    
        if (!globalBins) {
            return;
        }
    
        const numericalVariables = ['Age', 'Weight (kg)', 'Height (m)', 'Max_BPM', 'Avg_BPM', 'Resting_BPM', 'Session_Duration (hours)', 'Calories_Burned', 'Fat_Percentage', 'Water_Intake (liters)', 'BMI'];
        
        // Ensure both variables are numerical
        if (!numericalVariables.includes(var1) || !numericalVariables.includes(var2)) {
            return;
        }
    
        const var2Extent = d3.extent(data, d => +d[var2]);
        const xBinCount = 10;
        const x = d3.scaleLinear()
            .domain(var2Extent)
            .range([0, width]);
    
        const xHistogram = d3.histogram()
            .value(d => +d[var2])
            .domain(x.domain())
            .thresholds(x.ticks(xBinCount));
    
        const xBins = xHistogram(data);
    
        // Compute correlations between globalBins and xBins
        const correlationMatrix = globalBins.map(bin1 => 
            xBins.map(bin2 => {
                // Filter data points in both bin1 and bin2
                const binData = data.filter(d => 
                    +d[var1] >= bin1.x0 && +d[var1] < bin1.x1 &&
                    +d[var2] >= bin2.x0 && +d[var2] < bin2.x1
                );
    
                // If no data points in intersection, correlation is 0
                if (binData.length === 0) return 0;
    
                // Compute correlation for the intersection
                const n = binData.length;
                const x = binData.map(d => +d[var1]);
                const y = binData.map(d => +d[var2]);
    
                const meanX = d3.mean(x);
                const meanY = d3.mean(y);
    
                let covariance = 0;
                let varX = 0;
                let varY = 0;
    
                for (let i = 0; i < n; i++) {
                    const diffX = x[i] - meanX;
                    const diffY = y[i] - meanY;
                    covariance += diffX * diffY;
                    varX += diffX * diffX;
                    varY += diffY * diffY;
                }
    
                covariance /= (n - 1);
                varX /= (n - 1);
                varY /= (n - 1);
    
                // Pearson correlation coefficient
                return covariance / (Math.sqrt(varX) * Math.sqrt(varY));
            })
        );
    
        const colorScale = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range(['blue', 'white', 'red']);
    
        // Heatmap display code modified with ChatGPT
        const cellWidth = width / xBins.length;
        const cellHeight = height / globalBins.length;
    
        // Create heatmap cells
        for (let i = 0; i < globalBins.length; i++) {
            for (let j = 0; j < xBins.length; j++) {
                svg.append('rect')
                    .attr('x', j * cellWidth)
                    .attr('y', i * cellHeight)
                    .attr('width', cellWidth)
                    .attr('height', cellHeight)
                    .attr('fill', colorScale(correlationMatrix[i][j]))
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1);
            }
        }
        // X-axis labels for second variable bins
        svg.append('g')
            .selectAll('text')
            .data(xBins)
            .enter()
            .append('text')
            .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
            .attr('y', height + margin.bottom / 2 - 20)
            .attr('text-anchor', 'start')
            .attr('transform', (d, i) => `rotate(-45, ${i * cellWidth + cellWidth / 2}, ${height + margin.bottom / 2})`)
            .text(d => `${d.x0.toFixed(1)}-${d.x1.toFixed(1)}`)
            .attr('font-size', '9px');
        // Y-axis labels for first variable bins
        svg.append('g')
            .selectAll('text')
            .data(globalBins)
            .enter()
            .append('text')
            .attr('x', -margin.left / 2 + 25)
            .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'middle')
            .text(d => `${d.x0.toFixed(1)}-${d.x1.toFixed(1)}`)
            .attr('font-size', '9px');
    }

    createBiplot();
    
}).catch(function(error) {
    console.error("Error loading the CSV file:", error);
});