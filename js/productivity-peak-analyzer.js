// Productivity Peak Analyzer JavaScript

class ProductivityAnalyzer {
    constructor() {
        this.tasks = this.loadTasks();
        this.chart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDateTime();
        this.renderTasks();
        this.renderChart();
        this.updatePeakHours();
    }

    setupEventListeners() {
        const taskForm = document.getElementById('taskForm');
        const timeRange = document.getElementById('timeRange');
        const refreshChart = document.getElementById('refreshChart');
        const clearHistory = document.getElementById('clearHistory');

        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        timeRange.addEventListener('change', () => this.renderChart());
        refreshChart.addEventListener('click', () => this.renderChart());
        clearHistory.addEventListener('click', () => this.clearAllTasks());
    }

    setDefaultDateTime() {
        const now = new Date();
        const dateTimeInput = document.getElementById('taskTime');
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        dateTimeInput.value = localDateTime;
    }

    addTask() {
        const taskName = document.getElementById('taskName').value.trim();
        const taskTime = document.getElementById('taskTime').value;
        const taskCategory = document.getElementById('taskCategory').value;

        if (!taskName || !taskTime) return;

        const task = {
            id: Date.now(),
            name: taskName,
            time: new Date(taskTime).toISOString(),
            category: taskCategory
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.renderChart();
        this.updatePeakHours();

        // Reset form
        document.getElementById('taskForm').reset();
        this.setDefaultDateTime();
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        if (this.tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; color: var(--text-secondary, #718096);">No tasks logged yet. Start by logging your first completed task!</p>';
            return;
        }

        this.tasks.slice(0, 10).forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';

            const taskTime = new Date(task.time);
            const timeString = taskTime.toLocaleString();

            taskItem.innerHTML = `
                <div class="task-info">
                    <div class="task-name">${task.name}</div>
                    <div class="task-details">
                        ${timeString} • ${task.category}
                    </div>
                </div>
                <button class="task-delete" data-id="${task.id}">
                    <i data-lucide="x"></i>
                </button>
            `;

            taskList.appendChild(taskItem);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.currentTarget.dataset.id);
                this.deleteTask(taskId);
            });
        });

        // Re-render Lucide icons
        lucide.createIcons();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
        this.renderChart();
        this.updatePeakHours();
    }

    clearAllTasks() {
        if (confirm('Are you sure you want to clear all task history? This action cannot be undone.')) {
            this.tasks = [];
            this.saveTasks();
            this.renderTasks();
            this.renderChart();
            this.updatePeakHours();
        }
    }

    renderChart() {
        const timeRange = parseInt(document.getElementById('timeRange').value);
        const filteredTasks = this.getTasksInRange(timeRange);
        const hourlyData = this.calculateHourlyData(filteredTasks);

        const ctx = document.getElementById('productivityChart').getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Tasks Completed',
                    data: hourlyData,
                    backgroundColor: 'rgba(56, 161, 105, 0.6)',
                    borderColor: 'rgba(56, 161, 105, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Tasks Completed by Hour (Last ${timeRange} days)`
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Hour of Day'
                        }
                    }
                }
            }
        });
    }

    getTasksInRange(days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.tasks.filter(task => new Date(task.time) >= cutoffDate);
    }

    calculateHourlyData(tasks) {
        const hourlyCounts = new Array(24).fill(0);

        tasks.forEach(task => {
            const hour = new Date(task.time).getHours();
            hourlyCounts[hour]++;
        });

        return hourlyCounts;
    }

    updatePeakHours() {
        const timeRange = parseInt(document.getElementById('timeRange').value);
        const filteredTasks = this.getTasksInRange(timeRange);
        const hourlyData = this.calculateHourlyData(filteredTasks);

        // Find top 3 peak hours
        const hourCounts = hourlyData.map((count, hour) => ({ hour, count }));
        hourCounts.sort((a, b) => b.count - a.count);

        const peakHoursDiv = document.getElementById('peakHours');
        peakHoursDiv.innerHTML = '';

        if (hourCounts[0].count === 0) {
            peakHoursDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary, #718096);">No data available for peak hours analysis.</p>';
            return;
        }

        const topHours = hourCounts.slice(0, 3);

        topHours.forEach(({ hour, count }) => {
            const hourCard = document.createElement('div');
            hourCard.className = 'peak-hour-card';
            hourCard.innerHTML = `
                <div class="hour">${hour}:00</div>
                <div class="count">${count} task${count !== 1 ? 's' : ''}</div>
            `;
            peakHoursDiv.appendChild(hourCard);
        });
    }

    loadTasks() {
        const tasks = localStorage.getItem('productivityTasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('productivityTasks', JSON.stringify(this.tasks));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeNavbar();
    new ProductivityAnalyzer();
});

// Initialize navbar
function initializeNavbar() {
    fetch('../navbar.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('navbar-container').innerHTML = data;
        })
        .catch(error => console.error('Error loading navbar:', error));
}