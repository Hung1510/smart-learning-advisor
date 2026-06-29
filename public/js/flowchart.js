let tooltipNull = "Đang học";

// Drag and Scroll Functionality for Chart
const chart = document.querySelector('.chart');
let isDragging = false;
let startX, startY;
let scrollLeft, scrollTop;
let isHolding = false;
let holdTimeout;

chart.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    holdTimeout = setTimeout(() => {
        isHolding = true;
        isDragging = true;
        startX = e.pageX - chart.offsetLeft;
        startY = e.pageY - chart.offsetTop;
        scrollLeft = chart.scrollLeft;
        scrollTop = chart.scrollTop;
        chart.style.cursor = 'grabbing';
    }, 130);
});

chart.addEventListener('mouseup', () => {
    clearTimeout(holdTimeout);
    if (isHolding) {
        isDragging = false;
        chart.style.cursor = 'default';
        isHolding = false;
    }
});

chart.addEventListener('mouseleave', () => {
    clearTimeout(holdTimeout);
    if (isDragging) {
        isDragging = false;
        chart.style.cursor = 'default';
        isHolding = false;
    }
});

chart.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - chart.offsetLeft;
    const y = e.pageY - chart.offsetTop;
    const walkX = x - startX;
    const walkY = y - startY;
    chart.scrollLeft = scrollLeft - walkX;
    chart.scrollTop = scrollTop - walkY;
});

// Data Processing and Initialization
const flowchartContainer = document.getElementById('flowchart-container');
const drawData = JSON.parse(flowchartContainer.getAttribute('data-drawdata'));
const student = JSON.parse(flowchartContainer.getAttribute('data-student'));
const rawCoursesData = JSON.parse(flowchartContainer.getAttribute('data-coursesdata') || '{}');
const coursesData = Array.isArray(rawCoursesData) 
    ? rawCoursesData 
    : Object.values(rawCoursesData);
const cohortNumber = parseInt(student.cohort.slice(-2));
const idMap = {};
// Mapping from old course codes to new ones (used in the new flowchart)
const courseMapping = {
    'MATH 101': 'MATH 111',
    'CSE 101': 'CSE 100',
    'CSE 102': 'CSE 103',
    'CSE 107': 'CSE 104',
    'CSE 305': 'CSW 303',
    'CSE 307': 'CSW 304',
    'CSE 442': 'CSW 309',
    'CSE 453': 'CSW 405',
    'CSE 483': 'CSW 406',
    'CSE 441': 'CSW 430',
    'CSE 443': 'CSW 306',
    'EBS 415': 'CSW 435',
    'CSE 482': 'CSW 437',
    'CSE 450': 'CSW 439',
    'CSE 449': 'CSW 330',
    'CSE 457': 'CSW 331',
    'CSE 490': 'CSW 332',
    'CSE 470': 'CSN 305',
    'CSE 303': 'CSW 310',
    'POLS 132': 'POLS 130',
    'POLS 133': 'POLS 131',
};

// Add mapped equivalents to student.courses list
student.courses.forEach(item => {
    const mappedId = courseMapping[item.id];
    if (mappedId) {
        student.courses.push({
            id: mappedId,
            score: item.score,
            grade: item.grade
        });
    }
});


// Deduplicate courses, keeping highest score or non-null entry
student.courses.forEach(item => {
    const key = item.id;
    if (!idMap[key]) {
        idMap[key] = item;
    } else {
        const currentScore = idMap[key].score;
        const newScore = item.score;
        if (newScore == null) {
            idMap[key] = item;
        } else if (currentScore != null && parseFloat(newScore) > parseFloat(currentScore)) {
            idMap[key] = item;
        }
    }
});
const studentCourses = Object.values(idMap);

// Determine program version based on cohort

let program = student.major;
if (cohortNumber >= 23) program += '23';
else if (cohortNumber >= 21) program += '21';
else program += '18';

// const data = drawData["swe21"];
const data = drawData[program];
const elec = student.courses.filter(course => data.ELEC.some(elec => elec.name === course.id));
const matchedCourses = data.ELEC
    .map(e => {
        const c = elec.find(k => k.id === e.name);
        return c ? { elecId: e.id, courseId: c.id, score: c.score, grade: c.grade } : null;
    })
    .filter(Boolean);

const matchedElecIds = matchedCourses.map(course => course.elecId);
const matchedCountMap = {};

// Identify unmatched nodes
matchedElecIds.forEach(id => {
    matchedCountMap[id] = (matchedCountMap[id] || 0) + 1;
});

// Find unmatched node IDs, count time
const unmatchedNodeIds = [];

data.nodes.forEach(node => {
    const id = node.id;
    if (!id) return; // skip empty

    if (matchedCountMap[id]) {
        matchedCountMap[id]--; // remove 1 time
    } else {
        unmatchedNodeIds.push(id); // keep unmatched node
    }
});

// Calculate Grid Layout
const yearCount = data.nodes.reduce((acc, item) => {
    acc[item.year] = (acc[item.year] || 0) + 1;
    return acc;
}, {});
const numCol = Object.keys(yearCount).length;
const numRow = Math.max(...Object.values(yearCount));

const successCourses = student.courses.filter(item => item.grade != "F");
const lastYear = parseInt(data.nodes[data.nodes.length - 1].year);

// SVG and D3 Visualization Setup
const svg = d3.select("svg");
const tooltip = d3.select("#tooltip");
const svgElement = document.getElementById("mySvg");

const x_start = 80;
const y_start = 100;
const gap_col = 170;
const gap_row = 130;
const width = 80;
const height = 40;

// Set fixed SVG size for desktop
svgWidth = (gap_col - width) * numCol + width * (numCol);
svgHeight = (gap_row - height) * numRow + height * (numRow + 1);
svgElement.style.width = `${svgWidth}px`;
svgElement.style.height = `${svgHeight}px`;
svgElement.style.marginLeft = "auto";
svgElement.style.marginRight = "auto";

let x_move = x_start - gap_col;
let y_move = y_start;

// Define Arrow Markers
svg.append("defs")
    .append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 6)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#3399ff");

svg.append("defs")
    .append("marker")
    .attr("id", "arrow-gray")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 6)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#dbdada");

svg.append("defs")
    .append("marker")
    .attr("id", "arrow-current")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 6)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#d0e6ff");

const CourseGroup = Object.freeze({
    GENED: 'general-education-required',
    ELEC: 'general-education-elective',
    SPEC: 'specialized-required',
    SPEC_ELEC: 'specialized-elective',
    CAPSTONE: 'capstone-project'
});

const seenQuarter = new Map();
function getCourseData() {
    return coursesData;
}
// Process Nodes
const sortedNodes = [...data.nodes].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (a.slot || 0) - (b.slot || 0);
});

const nodes = sortedNodes.map(course => {
    const isFirstInQuarter = !seenQuarter.has(course.year);
    let x, y;
    const courseId = course.id;
    const courseData = coursesData.find(c =>
        c.id.trim().toUpperCase() === courseId.trim().toUpperCase()
    );

    let tooltip = course.tooltip;
    if (course.id.startsWith("ELEC")) {
        tooltip = "Môn học tự chọn";
    }
    let name = course.id;

    if (isFirstInQuarter) {
        x = (x_move += gap_col);
        seenQuarter.set(course.year, x);
    } else {
        x = seenQuarter.get(course.year);
    }

    // Dùng slot để tính y nếu có, không thì fallback về thứ tự
    if (course.slot !== undefined && course.slot !== null) {
        y = y_start + (course.slot - 1) * gap_row;
    } else {
        y = isFirstInQuarter ? y_start : (y_move += gap_row);
    }
    
    for (let item of studentCourses) {
        if (course.id == item.id) tooltip = `${item.score} ( ${item.grade} )`;
    }
    if (course.id.startsWith("ELEC")) {
        for (let i = 0; i < matchedCourses.length; i++) {
            const matchedCourse = matchedCourses[i];
            if (course.id === matchedCourse.elecId) {
                tooltip = `${matchedCourse.score} ( ${matchedCourse.grade} )`;
                matchedCourses.splice(i, 1);
                break;
            }
        }
    }
    if (tooltip == "null ( null )") {
        tooltip = tooltipNull;
    }
    if (tooltip == "" && courseData) {
        tooltip = courseData.review;
    }
    if (courseData) {
        name = courseData.name;
    }
    return {
        id: course.id,
        name: name,
        x,
        y,
        tooltip,
        group: CourseGroup[course.group] || undefined
    };
});

// Draw Years and Quarters
const yearExpand = 50;
const yearWidth = width * 3 + (gap_col - width) * 2;
const yearHeight = height / 2;
const yearKeys = Object.keys(yearCount);
const specialYearNum = yearKeys
    .filter(key => key.endsWith('.4'))
    .map(key => parseInt(key.split('.')[0]))
    .sort((a, b) => a - b)[0];
const specialYear = specialYearNum ? `Year ${specialYearNum}` : null;
const idexQuarter = yearKeys.map(key => parseInt(key.split('.')[1]));
const totalYears = lastYear;

x_move = 250 - yearExpand / 2;
let years = [];
let quarters = [];

for (let y = 1; y <= totalYears; y++) {
    let offset = (width * 3 + (gap_col - width) * 3);
    if (specialYearNum && y >= specialYearNum) x_move += offset + gap_col / 2;
    else if (y > 1) x_move += offset;
    years.push({ id: `Year ${y}`, x: x_move, y: 10 });
}

for (let i = 0; i < idexQuarter.length; i++) {
    quarters.push({ id: `Q${idexQuarter[i]}`, x: x_start + gap_col * i, y: 50 });
}

// Draw Year Labels
const yearGroup = svg
    .selectAll(".year")
    .data(years)
    .enter()
    .append("g")
    .attr("class", "year")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

yearGroup
    .append("rect")
    .attr("width", (d) => (specialYear.includes(d.id) ? yearWidth + gap_col + yearExpand : yearWidth + yearExpand))
    .attr("height", yearHeight)
    .attr("x", (d) => (specialYear.includes(d.id) ? -(yearWidth + gap_col) / 2 : -yearWidth / 2))
    .attr("y", -yearHeight / 2);

yearGroup
    .append("text")
    .attr("x", yearExpand / 2)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .text((d) => d.id);

// Draw Quarter Labels
const quaterGroup = svg
    .selectAll(".quarters")
    .data(quarters)
    .enter()
    .append("g")
    .attr("class", "quarters")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

quaterGroup
    .append("text")
    .attr("x", -width / 2 + yearExpand / 2 + height / 4)
    .attr("y", -height / 2 + height / 2)
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .text((d) => d.id);

// Draw Nodes
const filteredNodes = nodes.filter((node) => node.id.trim() !== "");
let lastTapTime = 0;
const nodeGroup = svg
    .selectAll(".node")
    .data(filteredNodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("data-id", d => d.id)
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
    .on("mousemove", function (event, d) {
        tooltip.style("display", "block")
            .style("left", d.x + 50 + "px")
            .style("top", d.y - 80 + "px")
            .html(`<strong>${d.name}</strong><br>${d.tooltip}`);
    })
    .on("mouseover", function (event, d) {
        d3.select(this).style("cursor", "pointer");
    })
    .on("mouseout", function () {
        tooltip.style("display", "none");
        timeoutId = setTimeout(() => {
            svg.selectAll(".view-button").remove(), 800
        });
    })
    .on("click", handleNodeClick)
    .on("dblclick", function (event, d) {
        const node = d3.select(this);
        if (!node.text().startsWith("ELEC")) {
            printMaldal(node.text());
        }
    })
    .on("touchend", function (event, d) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        if (tapLength < 300 && tapLength > 0) {
            const node = d3.select(this);
            if (!node.text().startsWith("ELEC")) {
                event.preventDefault();
                printMaldal(node.text());
            }
        }
        lastTapTime = currentTime;
    });

nodeGroup
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("x", -width / 2)
    .attr("y", -height / 2)
    .attr("class", (d) => {
        if (d.tooltip == tooltipNull) {
            return `course-${d.group} current-node check`;
        }
        if (d.tooltip != "") {
            const match = d.tooltip.match(/\(([^)]+)\)/);
            let grade = match ? match[1] : null;
            if (grade != null) {
                grade = grade.trim();
                if (grade === "F") return `course-${d.group} fail-node`;
                if (d.tooltip) return `course-${d.group} check`;
            }
        }
        return `course-${d.group}`;
    });

nodeGroup
    .append("text")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("class", (d) => (d.tooltip != "" && d.tooltip != "0.0 ( F )" && d.tooltip.length < 11 ? "checkText" : ""))
    .text((d) => d.id);

// Draw Links
d3.selectAll("path.link, path.highlighted-link").remove();
const links = data.links;
links.forEach((link) => {
    const source = nodes.find((n) => n.id === link.source);
    const target = nodes.find((n) => n.id === link.target);
    if (!source || !target) {
        console.warn(`Link not drawn: Source (${link.source}) or Target (${link.target}) not found`);
        return;
    }

    const direction = link.direction;
    const groups = direction.split(",").map(item => {
        const trimmed = item.trim();
        const [dir, value] = trimmed.split("-");
        const digits = value ? value.split("").filter(char => !isNaN(char) && char !== ".").map(Number) : [];
        return { dir, firstDigit: digits[0] || 0, secondDigit: digits[1] || 0 };
    });

    let x = source.x;
    let y = source.y;
    if (groups[0].dir === "right") x += width / 2;
    else if (groups[0].dir === "up") y -= height / 2;
    else if (groups[0].dir === "down") y += height / 2;
    else if (groups[0].dir === "left") x -= width / 2;
    let path = `M${x},${y}`;

    let flag = true;
    function first() {
        if (!flag) return;
        if (groups[1].dir === "right") x += width / 2;
        else if (groups[1].dir === "up") y -= height / 2;
        else if (groups[1].dir === "down") y += height / 2;
        else if (groups[1].dir === "left") x -= width / 2;
        flag = false;
    }

    const gap_c = (gap_col - width) / 4;
    const gap_r = (gap_row - height) / 4;

    groups.forEach(group => {
        const { dir, firstDigit, secondDigit } = group;
        if (dir === "right") x += (gap_col) * firstDigit + gap_c * secondDigit;
        else if (dir === "up") y -= (gap_row) * firstDigit + gap_r * secondDigit;
        else if (dir === "down") y += (gap_row) * firstDigit + gap_r * secondDigit;
        else if (dir === "left") x -= (gap_col) * firstDigit + gap_c * secondDigit;
        path += ` L${x},${y}`;
        if (groups.length > 1) first();
    });

    if (y < target.y - height / 2) path += `L${target.x},${y} L${target.x},${target.y - height / 2}`;
    else if (y > target.y + height / 2) path += `L${target.x},${y} L${target.x},${target.y + height / 2}`;
    else if (x < target.x - width / 2) path += `L${x},${target.y} L${target.x - width / 2},${target.y}`;
    else if (x > target.x + width / 2) path += `L${x},${target.y} L${target.x + width / 2},${target.y}`;

    svg.append("path")
        .attr("class", (d) => {
            if (source.tooltip != "" && source.tooltip != "0.0 ( F )" && source.tooltip != tooltipNull && source.tooltip.length < 15) {
                return "highlighted-link";
            }
            else if (source.tooltip == tooltipNull) {
                return "current-link";
            }
            else {
                return "link";
            }
        })
        .attr("data-source", link.source)
        .attr("data-target", link.target)
        .attr("d", path);
});

// Identify Unlocked Courses
const passedCourseIds = successCourses.map(course => course.id);
const targetToSources = {};
data.links.forEach(link => {
    if (!targetToSources[link.target]) {
        targetToSources[link.target] = [];
    }
    targetToSources[link.target].push(link.source);
});
const unlockedTargets = Object.entries(targetToSources)
    .filter(([target, sources]) =>
        sources.every(source => passedCourseIds.includes(source)) &&
        !passedCourseIds.includes(target)
    )
    .map(([target]) => target);
const allTargets = data.links.map(link => link.target);
const resultIds = unmatchedNodeIds
    .filter(
        id =>
            !allTargets.includes(id) &&
            !passedCourseIds.includes(id)
    );
svg.selectAll(".node rect")
    .each(function (d) {
        const isActive = resultIds.includes(d.id) || unlockedTargets.includes(d.id);
        d3.select(this)
            .classed("unlock-node", isActive);
    });
svg.selectAll(".node")
    .filter(d => resultIds.includes(d.id) || unlockedTargets.includes(d.id))
    .each(function (d) {
        const group = d3.select(this);
        const nodeRect = group.select("rect");
        if (nodeRect.classed("check")) {
            return;
        }
        // button check for unlock node
        const buttonX = d.x - 40;
        const buttonY = d.y + 8;
        const buttonWidth = 80;
        const buttonHeight = 20;

        const buttonGroup = svg.append("g")
            .attr("class", "view-choose")
            .attr("data-id", d.id)
            .attr("transform", `translate(${buttonX}, ${buttonY})`);

        buttonGroup.append("rect")
            .attr("class", "view-choose-rect")
            .attr("data-id", d.id)
            .attr("width", buttonWidth)
            .attr("height", buttonHeight)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("stroke-width", 2);
        buttonGroup.append("text")
            .attr("class", "view-choose-text")
            .attr("data-id", d.id)
            .attr("x", buttonWidth / 2)
            .attr("y", buttonHeight / 2)
            .attr("dy", ".35em")
            .text("✔");

        buttonGroup.on("click", function (event) {
            const textElement = buttonGroup.select(".view-choose-text");
            const currentText = textElement.text();
            const linksFromNode = svg.selectAll(`.link[data-source="${d.id}"]`);
            if (currentText === "✔") {
                const rectElement = buttonGroup.select(".view-choose-rect");
                textElement.text("✖");
                rectElement.classed("view-cancel-rect", true);
                rectElement.classed("view-choose-rect", false);
                nodeRect.classed("suggest-node", true);
                linksFromNode.classed("unlock-link", true);
            } else {
                const rectElement = buttonGroup.select(".view-cancel-rect");
                textElement.text("✔");
                rectElement.classed("view-cancel-rect", false);
                rectElement.classed("view-choose-rect", true);
                nodeRect.classed("suggest-node", false);
                linksFromNode.classed("unlock-link", false);
            }
        }
        );
    });

// Legend
const legendItems = [
    { class: 'course-general-education-required', label: 'General Education Required' },
    { class: 'course-general-education-elective', label: 'General Education Elective' },
    { class: 'course-specialized-required', label: 'Specialized Required' },
    { class: 'course-specialized-elective', label: 'Specialized Elective' },
    { class: 'course-capstone-project', label: 'Capstone Project' },
    { class: 'check', label: 'Completed Course' },
    { class: 'fail-node', label: 'Failed Course' },
    { class: 'current-node check', label: 'Current Course' },
    { class: 'suggest-node', label: 'Suggested Course' },
];

const legendGroup = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${svgWidth + 50}, ${svgHeight - 300})`);

const rectWidth = 20;
const rectHeight = 20;
const textOffsetX = 30;
const textOffsetY = 15;
const spacing = 30;

legendItems.forEach((item, index) => {
    const group = legendGroup.append('g')
        .attr('transform', `translate(0, ${index * spacing})`);

    group.append('rect')
        .attr('width', rectWidth)
        .attr('height', rectHeight)
        .attr('class', item.class);

    group.append('text')
        .attr('x', textOffsetX)
        .attr('y', textOffsetY)
        .attr('text-anchor', 'start')
        .attr('alignment-baseline', 'middle')
        .text(item.label);
});

//-- Event Handlers / Function --

// click to off selected-node
svg.on("mouseup", function (event) {
    if (event.target !== this) return;
    clearTimeout(holdTimeout);
    if (!isHolding) {
        svg.selectAll(".node").classed("selected", false);
        svg.selectAll(".link").classed("link--selected", false);
        svg.selectAll(".node text").style("fill", "#000");
        svg.selectAll(".selected-node").classed("selected-node", false);
    }
});

// click node show selected-node
function handleNodeClick(event, d) {
    const node = d3.select(this);
    const rect = node.select("rect");
    const filtered = data.ELEC.filter(item => item.id === node.text());
    if (node.text().startsWith("ELEC")) {
        showPopupTable(filtered);
    }

    if (rect.classed("check") || rect.classed("suggest-node") || rect.classed("unlock-node")) return;


    if (!node.text().startsWith("ELEC")) {
        try {
            let isLinkSelected = !svg.selectAll(`.link[data-source="${d.id}"]`).classed("link--selected");
            svg.selectAll(`.link[data-source="${d.id}"]`).classed("link--selected", isLinkSelected);
        } catch (error) { }
    }

    let isNodeSelected = !node.classed("selected-node");
    node.classed("selected-node", isNodeSelected);
}

// click on/off suggest course
function handlePrintOption(event) {
    const button = event.target;
    const isActive = button.getAttribute("data-active") === "true";
    button.setAttribute("data-active", (!isActive).toString());
    button.textContent = isActive ? "Xem Đề Xuất Môn" : "Tắt Đề Xuất Môn";

    let selectedValue = event.target.getAttribute("data-value");
    const elecIds = data.ELEC
        .filter(item => selectedValue.includes(item.name))
        .map(item => item.id);

    const isAlreadySelected = svg.selectAll(".node rect").filter(function (d) {
        return selectedValue.includes(d.id) || elecIds.includes(d.id);
    }).classed("suggest-node");

    const rect = d3.selectAll(".view-choose-rect, .view-cancel-rect")
        .filter(function () {
            const id = d3.select(this).attr("data-id");
            return selectedValue.includes(id) || elecIds.includes(id);
        });

    const parentGroups = rect.nodes().map(el => d3.select(el.parentNode));
    parentGroups.forEach(g => {
        const id = g.select(".view-choose-rect, .view-cancel-rect").attr("data-id");
        const textElement = g.select(".view-choose-text ");
        const rectElement = g.select(".view-choose-rect, .view-cancel-rect");
        const linksFromNode = svg.selectAll(`.link[data-source="${id}"]`);
        const nodeRect = svg.select(`.node[data-id="${id}"] rect`);

        if (isAlreadySelected) {
            textElement.text("✔");
            rectElement.classed("view-cancel-rect", false).classed("view-choose-rect", true);
            if (!nodeRect.empty()) {
                nodeRect.classed("suggest-node", false);
            }
            linksFromNode.classed("unlock-link", false);
        } else {
            textElement.text("✖");
            rectElement.classed("view-cancel-rect", true).classed("view-choose-rect", false);
            if (!nodeRect.empty()) {
                nodeRect.classed("suggest-node", true);
            }
            linksFromNode.classed("unlock-link", true);
        }
    });
}

// show table elec
function showPopupTable(data) {
    document.body.style.overflow = "hidden";
    let isNull = false;
    let isF = false;
    data.forEach(el => {
        const matched = elec.find(course => course.id === el.name);
        const courseId = el.name;
        const courseData = coursesData.find(c =>
            c.id.trim().toUpperCase() === courseId.trim().toUpperCase()
        );
        if (matched) {
            if (matched.grade == null) isNull = true;
            if (matched.grade == "F") isF = true;
            el.tooltip = `${matched.score} ( ${matched.grade} )`;
            if (el.tooltip == "null ( null )") {
                el.tooltip = tooltipNull;
            }
        }
    });
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const course = data[i];
        const row = [];
        const courseId = course.name;
        const courseData = coursesData.find(c =>
            c.id.trim().toUpperCase() === courseId.trim().toUpperCase()
        );
        if (courseData) {
            row.push(course.name);
            row.push(courseData.name);
            row.push(courseData.review);
            row.push(course.tooltip);
        }
        else {
            row.push(course.id);
            row.push(course.name);
            row.push(course.tooltip);
            row.push("");
        }

        result.push(row);
    }

    const overlay = d3.select("#popupOverlay");
    const tableHeader = d3.select("#tableHeader");
    const tableBody = d3.select("#tableBody");
    const noDataMessage = d3.select("#noDataMessage");

    tableHeader.html("");
    tableBody.html("");
    noDataMessage.style("display", "none");

    overlay.style("display", "flex");

    d3.select("#closePopup").on("click", () => {
        svg.selectAll(".selected-node").classed("selected-node", false);
        overlay.style("display", "none");
        document.body.style.overflow = "";
    });

    if (result.length > 0) {
        result.forEach(rowData => {
            const row = tableBody.append("tr").attr("class", "clickable-row");
            rowData.forEach(cell => row.append("td").text(cell));
        });
    } else {
        noDataMessage.style("display", "block");
    }
}

// Print Chart
function printChart() {
    const group = document.getElementById('mySvg');
    // 1. hide tooltip Bootstrap
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const disposedTooltips = [];

    tooltipTriggerList.forEach(el => {
        const tooltipInstance = bootstrap.Tooltip.getInstance(el);
        if (tooltipInstance) {
            tooltipInstance.dispose();
            disposedTooltips.push(el);
        }
    });

    group.setAttribute('transform', `translate(0, -700) rotate(90 -${svgWidth / 2} ${svgHeight / 2})`);
    group.style.overflow = 'visible';
    window.print();
    group.setAttribute('transform', `translate(0, 0) rotate(0 ${svgWidth / 2} ${svgHeight / 2})`);
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
}

// Advisor Submission
document.querySelectorAll("#goToAdvisor1, #goToAdvisor2").forEach(button => {
    button.addEventListener("click", async function () {
        try {
            const res = await fetch('/advisor-token', { method: 'POST' });
            const data = await res.json();
            if (data.token) {
                window.location.href = '/advisor';
            }
        } catch (err) {
            alert('Lỗi khi tạo token');
        }
    });
});

document.querySelectorAll("#save1, #save2").forEach(button => {
    button.addEventListener("click", async function () {
        const saveButton = this;
        // Change button content
        saveButton.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> Saving...`;

        const selectedCourses = svg.selectAll("rect.suggest-node.unlock-node")
            .nodes()
            .map(node => {
                const textElement = node.nextElementSibling;
                return textElement?.textContent.trim() || null;
            });

        try {
            const response = await fetch('/flowchart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courses: selectedCourses
                })
            });
            if (response.ok) {
                saveButton.innerHTML = `<i class="fas fa-save me-1"></i>`;
                window.location.reload();
            } else {
                console.error("POST thất bại", await response.text());
                saveButton.innerHTML = `<i class="fas fa-times me-1"></i> Failed`;
            }
        } catch (err) {
            console.error("Lỗi khi gửi dữ liệu:", err);
            saveButton.innerHTML = `<i class="fas fa-times me-1"></i> Error`;
        }
    });
});



document.addEventListener('DOMContentLoaded', () => {
    const suggestButton = document.getElementById('suggestButton');

    // Tooltip handling
    suggestButton?.addEventListener('mouseenter', () => {
        let suggestTooltip = suggestButton.querySelector('.suggest-tooltip');

        if (!suggestTooltip) {
            suggestTooltip = document.createElement('div');
            suggestTooltip.className = 'suggest-tooltip';
            suggestTooltip.textContent = suggestButton.getAttribute('data-tooltip') || 'Suggestion';
            suggestTooltip.style.display = 'flex';
            suggestButton.appendChild(suggestTooltip);
        } else {
            suggestTooltip.style.display = 'flex';
        }
    });

    suggestButton?.addEventListener('mouseleave', () => {
        const tooltip = suggestButton.querySelector('.suggest-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    });

    // Modal handling
    document.querySelectorAll("#showFunctions1, #showFunctions2").forEach(button => {
        button.addEventListener("click", async function () {
            const functionModal = new bootstrap.Modal(document.getElementById('functionModal'));
            functionModal.show();
        });
    });
    const showGuideButton = document.getElementById('showGuide');
    showGuideButton?.addEventListener('click', () => {
        const guideModal = new bootstrap.Modal(document.getElementById('guideModal'));
        guideModal.show();
    });

});

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));


// show info of course
function printMaldal(id) {
    const courseId = id;
    const course = coursesData.find(c =>
        c.id.trim().toUpperCase() === courseId.trim().toUpperCase()
    );
    document.getElementById('course-id').innerText = courseId;
    document.getElementById('course-name').innerText = course?.name || 'Không tìm thấy thông tin';
    document.getElementById('course-english').innerText = course?.english || '';
    document.getElementById('course-objective').innerText = course?.objective || '';
    const functionModal = new bootstrap.Modal(document.getElementById('courseModal'));
    functionModal.show();
}
document.getElementById("tableBody").addEventListener("click", function (e) {
    const tr = e.target.closest("tr");
    if (tr) {
        const tds = tr.querySelectorAll("td");
        printMaldal(tds[0]?.textContent.trim());

    }
})
document.querySelectorAll('.show-courses-btn').forEach(btn => {
    btn.addEventListener('click', handlePrintOption);
});

document.querySelectorAll('.print-btn').forEach(btn => {
    btn.addEventListener('click', printChart);
});

// Initialize tooltip on large screen
if (window.matchMedia("(min-width: 576px)").matches) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
}

