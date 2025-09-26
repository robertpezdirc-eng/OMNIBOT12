// Omni AI Platform - Charts and Visualization Module
console.log('Charts module loading...');

// Chart configuration
const ChartConfig = {
    colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        light: '#f8f9fa',
        dark: '#343a40'
    },
    gradients: {
        blue: ['#007bff', '#0056b3'],
        green: ['#28a745', '#1e7e34'],
        orange: ['#fd7e14', '#e55100'],
        purple: ['#6f42c1', '#5a32a3'],
        red: ['#dc3545', '#c82333']
    },
    animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
    }
};

// Chart state management
const ChartState = {
    charts: {},
    containers: {},
    data: {},
    updateTimers: {}
};

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing charts...');
    initializeCharts();
});

function initializeCharts() {
    try {
        // Find all chart containers
        const chartContainers = document.querySelectorAll('[data-chart]');
        
        chartContainers.forEach(container => {
            const chartType = container.getAttribute('data-chart');
            const chartId = container.id || generateChartId();
            
            if (!container.id) {
                container.id = chartId;
            }
            
            createChart(chartId, chartType, container);
        });
        
        // Setup auto-refresh for charts
        setupAutoRefresh();
        
        console.log(`Initialized ${Object.keys(ChartState.charts).length} charts`);
        
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function createChart(chartId, chartType, container) {
    try {
        console.log(`Creating chart: ${chartId} (${chartType})`);
        
        // Store container reference
        ChartState.containers[chartId] = container;
        
        // Create chart based on type
        switch (chartType) {
            case 'line':
                ChartState.charts[chartId] = createLineChart(container);
                break;
            case 'bar':
                ChartState.charts[chartId] = createBarChart(container);
                break;
            case 'pie':
                ChartState.charts[chartId] = createPieChart(container);
                break;
            case 'doughnut':
                ChartState.charts[chartId] = createDoughnutChart(container);
                break;
            case 'area':
                ChartState.charts[chartId] = createAreaChart(container);
                break;
            case 'gauge':
                ChartState.charts[chartId] = createGaugeChart(container);
                break;
            case 'heatmap':
                ChartState.charts[chartId] = createHeatmapChart(container);
                break;
            default:
                console.warn(`Unknown chart type: ${chartType}`);
                ChartState.charts[chartId] = createDefaultChart(container);
        }
        
        // Load initial data
        loadChartData(chartId, chartType);
        
    } catch (error) {
        console.error(`Error creating chart ${chartId}:`, error);
    }
}

function createLineChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'line',
        canvas: canvas,
        ctx: ctx,
        data: {
            labels: [],
            datasets: []
        },
        render: function() {
            renderLineChart(this);
        },
        update: function(newData) {
            updateLineChart(this, newData);
        }
    };
}

function createBarChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'bar',
        canvas: canvas,
        ctx: ctx,
        data: {
            labels: [],
            datasets: []
        },
        render: function() {
            renderBarChart(this);
        },
        update: function(newData) {
            updateBarChart(this, newData);
        }
    };
}

function createPieChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'pie',
        canvas: canvas,
        ctx: ctx,
        data: {
            labels: [],
            datasets: []
        },
        render: function() {
            renderPieChart(this);
        },
        update: function(newData) {
            updatePieChart(this, newData);
        }
    };
}

function createDoughnutChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'doughnut',
        canvas: canvas,
        ctx: ctx,
        data: {
            labels: [],
            datasets: []
        },
        render: function() {
            renderDoughnutChart(this);
        },
        update: function(newData) {
            updateDoughnutChart(this, newData);
        }
    };
}

function createAreaChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'area',
        canvas: canvas,
        ctx: ctx,
        data: {
            labels: [],
            datasets: []
        },
        render: function() {
            renderAreaChart(this);
        },
        update: function(newData) {
            updateAreaChart(this, newData);
        }
    };
}

function createGaugeChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'gauge',
        canvas: canvas,
        ctx: ctx,
        data: {
            value: 0,
            max: 100,
            min: 0
        },
        render: function() {
            renderGaugeChart(this);
        },
        update: function(newData) {
            updateGaugeChart(this, newData);
        }
    };
}

function createHeatmapChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'heatmap',
        canvas: canvas,
        ctx: ctx,
        data: {
            data: [],
            xLabels: [],
            yLabels: []
        },
        render: function() {
            renderHeatmapChart(this);
        },
        update: function(newData) {
            updateHeatmapChart(this, newData);
        }
    };
}

function createDefaultChart(container) {
    const canvas = createCanvas(container);
    const ctx = canvas.getContext('2d');
    
    return {
        type: 'default',
        canvas: canvas,
        ctx: ctx,
        data: {},
        render: function() {
            renderDefaultChart(this);
        },
        update: function(newData) {
            this.data = newData;
            this.render();
        }
    };
}

function createCanvas(container) {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    // Set actual canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 300;
    
    container.appendChild(canvas);
    return canvas;
}

function renderLineChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    // Clear canvas
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    if (!data.datasets || data.datasets.length === 0) {
        renderNoData(ctx, chart.canvas);
        return;
    }
    
    // Setup chart area
    const padding = 40;
    const chartWidth = chart.canvas.width - (padding * 2);
    const chartHeight = chart.canvas.height - (padding * 2);
    
    // Draw axes
    drawAxes(ctx, padding, chartWidth, chartHeight);
    
    // Draw data lines
    data.datasets.forEach((dataset, index) => {
        drawLine(ctx, dataset, data.labels, padding, chartWidth, chartHeight, index);
    });
    
    // Draw legend
    drawLegend(ctx, data.datasets, chart.canvas.width, padding);
}

function renderBarChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    if (!data.datasets || data.datasets.length === 0) {
        renderNoData(ctx, chart.canvas);
        return;
    }
    
    const padding = 40;
    const chartWidth = chart.canvas.width - (padding * 2);
    const chartHeight = chart.canvas.height - (padding * 2);
    
    drawAxes(ctx, padding, chartWidth, chartHeight);
    
    // Draw bars
    const barWidth = chartWidth / (data.labels.length * data.datasets.length + data.labels.length);
    
    data.datasets.forEach((dataset, datasetIndex) => {
        dataset.data.forEach((value, index) => {
            const x = padding + (index * (barWidth * data.datasets.length + barWidth)) + (datasetIndex * barWidth);
            const barHeight = (value / getMaxValue(data.datasets)) * chartHeight;
            const y = padding + chartHeight - barHeight;
            
            ctx.fillStyle = dataset.backgroundColor || ChartConfig.colors.primary;
            ctx.fillRect(x, y, barWidth, barHeight);
        });
    });
    
    drawLegend(ctx, data.datasets, chart.canvas.width, padding);
}

function renderPieChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    if (!data.datasets || data.datasets.length === 0) {
        renderNoData(ctx, chart.canvas);
        return;
    }
    
    const centerX = chart.canvas.width / 2;
    const centerY = chart.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, value) => sum + value, 0);
    
    let currentAngle = -Math.PI / 2;
    
    dataset.data.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        
        ctx.fillStyle = dataset.backgroundColor[index] || getColorByIndex(index);
        ctx.fill();
        
        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.labels[index], labelX, labelY);
        
        currentAngle += sliceAngle;
    });
}

function renderDoughnutChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    if (!data.datasets || data.datasets.length === 0) {
        renderNoData(ctx, chart.canvas);
        return;
    }
    
    const centerX = chart.canvas.width / 2;
    const centerY = chart.canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) - 20;
    const innerRadius = outerRadius * 0.6;
    
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, value) => sum + value, 0);
    
    let currentAngle = -Math.PI / 2;
    
    dataset.data.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = dataset.backgroundColor[index] || getColorByIndex(index);
        ctx.fill();
        
        currentAngle += sliceAngle;
    });
    
    // Draw center text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Total', centerX, centerY - 5);
    ctx.font = '14px Arial';
    ctx.fillText(total.toString(), centerX, centerY + 15);
}

function renderAreaChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    if (!data.datasets || data.datasets.length === 0) {
        renderNoData(ctx, chart.canvas);
        return;
    }
    
    const padding = 40;
    const chartWidth = chart.canvas.width - (padding * 2);
    const chartHeight = chart.canvas.height - (padding * 2);
    
    drawAxes(ctx, padding, chartWidth, chartHeight);
    
    // Draw area
    data.datasets.forEach((dataset, index) => {
        drawArea(ctx, dataset, data.labels, padding, chartWidth, chartHeight, index);
    });
    
    drawLegend(ctx, data.datasets, chart.canvas.width, padding);
}

function renderGaugeChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    const centerX = chart.canvas.width / 2;
    const centerY = chart.canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    // Draw gauge background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // Draw gauge value
    const percentage = (data.value - data.min) / (data.max - data.min);
    const angle = Math.PI + (percentage * Math.PI);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, angle);
    ctx.strokeStyle = getGaugeColor(percentage);
    ctx.lineWidth = 20;
    ctx.stroke();
    
    // Draw center text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(data.value.toString(), centerX, centerY + 10);
    
    // Draw min/max labels
    ctx.font = '12px Arial';
    ctx.fillText(data.min.toString(), centerX - radius + 10, centerY + 30);
    ctx.fillText(data.max.toString(), centerX + radius - 10, centerY + 30);
}

function renderHeatmapChart(chart) {
    const ctx = chart.ctx;
    const data = chart.data;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    if (!data.data || data.data.length === 0) {
        renderNoData(ctx, chart.canvas);
        return;
    }
    
    const padding = 40;
    const cellWidth = (chart.canvas.width - padding * 2) / data.xLabels.length;
    const cellHeight = (chart.canvas.height - padding * 2) / data.yLabels.length;
    
    // Find min/max values for color scaling
    const values = data.data.flat();
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Draw heatmap cells
    data.data.forEach((row, y) => {
        row.forEach((value, x) => {
            const intensity = (value - minValue) / (maxValue - minValue);
            const color = getHeatmapColor(intensity);
            
            ctx.fillStyle = color;
            ctx.fillRect(
                padding + x * cellWidth,
                padding + y * cellHeight,
                cellWidth,
                cellHeight
            );
            
            // Draw value text
            ctx.fillStyle = intensity > 0.5 ? '#fff' : '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                value.toString(),
                padding + x * cellWidth + cellWidth / 2,
                padding + y * cellHeight + cellHeight / 2
            );
        });
    });
    
    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    
    // X labels
    data.xLabels.forEach((label, index) => {
        ctx.textAlign = 'center';
        ctx.fillText(
            label,
            padding + index * cellWidth + cellWidth / 2,
            chart.canvas.height - 10
        );
    });
    
    // Y labels
    data.yLabels.forEach((label, index) => {
        ctx.textAlign = 'right';
        ctx.fillText(
            label,
            padding - 10,
            padding + index * cellHeight + cellHeight / 2
        );
    });
}

function renderDefaultChart(chart) {
    const ctx = chart.ctx;
    
    ctx.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    // Draw placeholder
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
    
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
        'Graf bo prikazan tukaj',
        chart.canvas.width / 2,
        chart.canvas.height / 2
    );
}

function renderNoData(ctx, canvas) {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Ni podatkov za prikaz', canvas.width / 2, canvas.height / 2);
}

// Helper functions
function drawAxes(ctx, padding, width, height) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + height);
    ctx.lineTo(padding + width, padding + height);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + height);
    ctx.stroke();
}

function drawLine(ctx, dataset, labels, padding, width, height, index) {
    if (!dataset.data || dataset.data.length === 0) return;
    
    const maxValue = getMaxValue([dataset]);
    const stepX = width / (labels.length - 1);
    
    ctx.strokeStyle = dataset.borderColor || getColorByIndex(index);
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    dataset.data.forEach((value, i) => {
        const x = padding + (i * stepX);
        const y = padding + height - ((value / maxValue) * height);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = dataset.borderColor || getColorByIndex(index);
    dataset.data.forEach((value, i) => {
        const x = padding + (i * stepX);
        const y = padding + height - ((value / maxValue) * height);
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawArea(ctx, dataset, labels, padding, width, height, index) {
    if (!dataset.data || dataset.data.length === 0) return;
    
    const maxValue = getMaxValue([dataset]);
    const stepX = width / (labels.length - 1);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + height);
    const color = dataset.backgroundColor || getColorByIndex(index);
    gradient.addColorStop(0, color + '80');
    gradient.addColorStop(1, color + '20');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    // Start from bottom left
    ctx.moveTo(padding, padding + height);
    
    // Draw line to data points
    dataset.data.forEach((value, i) => {
        const x = padding + (i * stepX);
        const y = padding + height - ((value / maxValue) * height);
        ctx.lineTo(x, y);
    });
    
    // Close path to bottom right
    ctx.lineTo(padding + width, padding + height);
    ctx.closePath();
    ctx.fill();
    
    // Draw line on top
    drawLine(ctx, dataset, labels, padding, width, height, index);
}

function drawLegend(ctx, datasets, canvasWidth, padding) {
    const legendY = 10;
    let legendX = canvasWidth - 150;
    
    datasets.forEach((dataset, index) => {
        const color = dataset.backgroundColor || dataset.borderColor || getColorByIndex(index);
        
        // Draw color box
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY + (index * 20), 12, 12);
        
        // Draw label
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label || `Dataset ${index + 1}`, legendX + 20, legendY + (index * 20) + 9);
    });
}

function getMaxValue(datasets) {
    let max = 0;
    datasets.forEach(dataset => {
        if (dataset.data) {
            const datasetMax = Math.max(...dataset.data);
            if (datasetMax > max) max = datasetMax;
        }
    });
    return max || 100;
}

function getColorByIndex(index) {
    const colors = Object.values(ChartConfig.colors);
    return colors[index % colors.length];
}

function getGaugeColor(percentage) {
    if (percentage < 0.3) return ChartConfig.colors.danger;
    if (percentage < 0.7) return ChartConfig.colors.warning;
    return ChartConfig.colors.success;
}

function getHeatmapColor(intensity) {
    const r = Math.floor(255 * intensity);
    const g = Math.floor(255 * (1 - intensity));
    const b = 100;
    return `rgb(${r}, ${g}, ${b})`;
}

function generateChartId() {
    return 'chart_' + Math.random().toString(36).substr(2, 9);
}

function loadChartData(chartId, chartType) {
    // Simulate loading data
    setTimeout(() => {
        const sampleData = generateSampleData(chartType);
        updateChart(chartId, sampleData);
    }, 500);
}

function generateSampleData(chartType) {
    switch (chartType) {
        case 'line':
        case 'area':
            return {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'],
                datasets: [{
                    label: 'Prodaja',
                    data: [65, 59, 80, 81, 56, 55],
                    borderColor: ChartConfig.colors.primary,
                    backgroundColor: ChartConfig.colors.primary
                }]
            };
        case 'bar':
            return {
                labels: ['Turizem', 'Gostinstvo', 'Kmetijstvo', 'IT'],
                datasets: [{
                    label: 'Učinkovitost',
                    data: [85, 92, 78, 95],
                    backgroundColor: [
                        ChartConfig.colors.primary,
                        ChartConfig.colors.success,
                        ChartConfig.colors.warning,
                        ChartConfig.colors.info
                    ]
                }]
            };
        case 'pie':
        case 'doughnut':
            return {
                labels: ['Desktop', 'Mobilni', 'Tablet'],
                datasets: [{
                    data: [60, 30, 10],
                    backgroundColor: [
                        ChartConfig.colors.primary,
                        ChartConfig.colors.success,
                        ChartConfig.colors.warning
                    ]
                }]
            };
        case 'gauge':
            return {
                value: 75,
                min: 0,
                max: 100
            };
        case 'heatmap':
            return {
                data: [
                    [1, 3, 5, 2],
                    [2, 4, 1, 3],
                    [5, 2, 3, 4],
                    [3, 1, 4, 2]
                ],
                xLabels: ['Q1', 'Q2', 'Q3', 'Q4'],
                yLabels: ['2021', '2022', '2023', '2024']
            };
        default:
            return {};
    }
}

function updateChart(chartId, newData) {
    const chart = ChartState.charts[chartId];
    if (chart && chart.update) {
        chart.update(newData);
        chart.render();
    }
}

function setupAutoRefresh() {
    // Refresh charts every 30 seconds
    setInterval(() => {
        Object.keys(ChartState.charts).forEach(chartId => {
            const container = ChartState.containers[chartId];
            if (container) {
                const chartType = container.getAttribute('data-chart');
                loadChartData(chartId, chartType);
            }
        });
    }, 30000);
}

// Chart update functions for different types
function updateLineChart(chart, newData) {
    chart.data = newData;
}

function updateBarChart(chart, newData) {
    chart.data = newData;
}

function updatePieChart(chart, newData) {
    chart.data = newData;
}

function updateDoughnutChart(chart, newData) {
    chart.data = newData;
}

function updateAreaChart(chart, newData) {
    chart.data = newData;
}

function updateGaugeChart(chart, newData) {
    chart.data = { ...chart.data, ...newData };
}

function updateHeatmapChart(chart, newData) {
    chart.data = newData;
}

// Public API
const ChartsManager = {
    createChart: createChart,
    updateChart: updateChart,
    getChart: (chartId) => ChartState.charts[chartId],
    getAllCharts: () => ChartState.charts,
    refreshAll: () => {
        Object.keys(ChartState.charts).forEach(chartId => {
            const chart = ChartState.charts[chartId];
            if (chart && chart.render) {
                chart.render();
            }
        });
    },
    config: ChartConfig
};

// Export for global access
window.ChartsManager = ChartsManager;
window.updateCharts = updateChart;

console.log('Charts module loaded successfully');