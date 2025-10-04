// vgsales.csv from: https://www.kaggle.com/code/upadorprofzs/eda-video-game-sales
// I generated code from Cloude and ChatGPT using D3 to learn and used to implement my own coding using D3
d3.csv("vgsales.csv").then(function(data) {
    // Define variables
    const numericalVariables = ['Year', 'NA_Sales (millions)', 'EU_Sales (millions)', 'JP_Sales (millions)', 'Other_Sales (millions)', 'Global_Sales (millions)'];
    const categoricalVariables = ['Platform', 'Genre', 'Publisher'];
    const allVariables = [...numericalVariables, ...categoricalVariables];

    // Populate select elements
    populateSelect("#variable-select", allVariables);

    // Add event listeners
    d3.selectAll("input[name='display-mode']").on("change", function() {
        const mode = this.value;
        d3.selectAll(".display-mode").style("display", "none");
        d3.select(`#${mode}-display`).style("display", "block");
        
        // Clear charts when switching modes
        d3.select("#chart").html("");
        d3.select("#future-chart").html("Future visualizations will be displayed here.");
    });

    d3.select("#variable-select").on("change", updateChart);
    d3.selectAll("input[name='scatter-axis']").on("change", updateChart);

    // Function to populate select elements
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
        // Clear previous chart elements
        d3.select("#chart").selectAll("svg").remove();
    
        const firstVariable = d3.select("#variable-select").property("value");
        
        if (firstVariable) {
            createBarChart(firstVariable);
            createPieChart(firstVariable);
        }
    }

    function createBarChart(variable) {
        const isNumerical = numericalVariables.includes(variable);
        let processedData;

        if (isNumerical) {
            const histogram = d3.histogram()
                .value(d => +d[variable])
                .domain(d3.extent(data, d => +d[variable]))
                .thresholds(10);

            processedData = histogram(data);
        } else {
            const counts = d3.rollup(data, v => v.length, d => d[variable]);
            processedData = Array.from(counts, ([key, value]) => ({key, value}))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
        }
        // I used Claude to figure out how to make a bar chart
        const margin = {top: 20, right: 30, bottom: 85, left: 65};
        const width = 800;
        const height = 500;
        // code made using the Claude code snippet on how to use D3
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // scaling function for the space between X keys (differentate between catagorical & numerical keys)
        const x = isNumerical
            ? d3.scaleLinear()
                .domain([processedData[0].x0, processedData[processedData.length - 1].x1])
                .range([0, width])
            : d3.scaleBand()
                .domain(processedData.map(d => d.key))
                .range([0, width])
                .padding(0.1);
        
        // scaling function for the space between Y frequency ranges
        const y = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => isNumerical ? d.length : d.value)])
            .range([height, 0]);

        // I used Claude to figure out how to add values to chart
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-35)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.selectAll("rect")
            .data(processedData)
            .enter()
            .append("rect")
            .attr("x", d => isNumerical ? x(d.x0) : x(d.key))
            .attr("y", d => y(isNumerical ? d.length : d.value))
            .attr("width", d => isNumerical ? x(d.x1) - x(d.x0) - 1 : x.bandwidth())
            .attr("height", d => height - y(isNumerical ? d.length : d.value))
            .attr("fill", "blue");

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .text(variable);

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text("Frequency");
    }

    function createPieChart(variable) {
        const counts = d3.rollup(data, v => v.length, d => d[variable]);
        let processedData = Array.from(counts, ([key, value]) => ({key, value}))
            .sort((a, b) => b.value - a.value);

        // decrease to top five + others catagory
        if (processedData.length > 5) {
            const topFive = processedData.slice(0, 5);
            const others = processedData.slice(5);
            const othersSum = d3.sum(others, d => d.value);
            topFive.push({key: 'others', value: othersSum});
            processedData = topFive;
        }

        const margin = {top: 20, right: 350, bottom: 85, left: 45};
        const width = 600;
        const height = 600;
        const radius = Math.min(width, height) / 2;

        // understood and implemented using previously referenced code
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.right+ margin.left)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);
        
        const color = d3.scaleOrdinal(d3.schemeSet3);
        // I used Claude as reference to figure out how to make a pie chart
        const pie = d3.pie()
            .value(d => d.value);

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        const arcs = svg.selectAll("arc")
            .data(pie(processedData))
            .enter()
            .append("g");
        
        arcs.append("path")
            .attr("d", arc)
            .attr("fill", (_, i) => color(i));

        const total = d3.sum(processedData, d => d.value);
        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .text(d => `${((d.data.value / total) * 100).toFixed(1)}%`);
        
        // code for legend made by referencing code snippet from https://d3-graph-gallery.com/graph/custom_legend.html
        const legend = svg.append("g")
            .attr("transform", `translate(${radius-50},${margin.top-radius})`);  // Position legend beside the pie chart
        var size = 20
        legend.selectAll("mydots")
            .data(processedData)
            .enter()
            .append("rect")
            .attr("x", 100)
            .attr("y", function(_,i){ return 100 + i*(size+5)}) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("width", size)
            .attr("height", size)
            .style("fill", (_, i) => color(i))
        
        legend.selectAll("mylabels")
            .data(processedData)
            .enter()
            .append("text")
            .attr("x", 100 + size*1.2)
            .attr("y", function(_,i){ return 100 + i*(size+5) + (size/1.5)}) // 100 is where the first dot appears. 25 is the distance between dots
            .text(function(d){ return `Number for ${d.key}`})
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
    }
    

    function createScatterPlot(xVariable, yVariable) {
        const margin = {top: 20, right: 20, bottom: 70, left: 80};
        const width = 800;
        const height = 500;

        // understood and implemented using previously referenced code
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const isXNumerical = numericalVariables.includes(xVariable);
        const isYNumerical = numericalVariables.includes(yVariable);
        
        // I used ChatGPT to understand how to scale disks in proportion to the number of points
        let xScale, yScale;
        
        if (isXNumerical) {
            xScale = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[xVariable]))
                .range([0, width]);
        } else {
            const xCategories = Array.from(new Set(data.map(d => d[xVariable])));
            xScale = d3.scaleBand()
                .domain(xCategories)
                .range([0, width])
                .padding(0.1);
        }
        if (isYNumerical) {
            yScale = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[yVariable]))
                .range([height, 0]);
        } else {
            const yCategories = Array.from(new Set(data.map(d => d[yVariable])));
            yScale = d3.scaleBand()
                .domain(yCategories)
                .range([height, 0])
                .padding(0.1);
        }

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        if (!isXNumerical && !isYNumerical) {
            const counts = d3.rollups(data, v => v.length, d => d[xVariable], d => d[yVariable]);

            const pointsData = [];
            counts.forEach(([xKey, yValues]) => {
                yValues.forEach(([yKey, count]) => {
                    pointsData.push({xKey, yKey, count});
                });
            });

            const radiusScale = d3.scaleSqrt()
                .domain([0, d3.max(pointsData, d => d.count)])
                .range([3, 20]);

            svg.selectAll("circle")
                .data(pointsData)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.xKey) + xScale.bandwidth() / 2)
                .attr("cy", d => yScale(d.yKey) + yScale.bandwidth() / 2)
                .attr("r", d => radiusScale(d.count))
                .attr("fill", "blue");

        } else {
            console.log(data)
            svg.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => isXNumerical ? xScale(+d[xVariable]) : xScale(d[xVariable]) + xScale.bandwidth() / 2)
                .attr("cy", d => isYNumerical ? yScale(+d[yVariable]) : yScale(d[yVariable]) + yScale.bandwidth() / 2)
                .attr("r", 3)
                .attr("fill", "blue");
        }
        // From previous code template
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .text(xVariable);

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text(yVariable);
    }
});