import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ChartData } from '../../../core/models';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart.component.html',
  styles: []
})
export class ChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() data: ChartData | null = null;
  @Input() type: 'doughnut' | 'line' | 'bar' = 'doughnut';
  @Input() height: number = 200;

  private chart: Chart | null = null;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    if (!this.data || !this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    this.chartCanvas.nativeElement.height = this.height;

    const config: ChartConfiguration = {
      type: this.type,
      data: {
        labels: this.data.labels,
        datasets: this.data.datasets.map(dataset => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor,
          borderColor: dataset.borderColor,
          borderWidth: dataset.borderWidth || 1
        }))
      },
      options: this.getChartOptions()
    };

    this.chart = new Chart(ctx, config);
  }

  private getChartOptions(): Record<string, unknown> {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          }
        }
      }
    };

    if (this.type === 'doughnut') {
      return {
        ...commonOptions,
        cutout: '60%',
        plugins: {
          ...commonOptions.plugins,
          tooltip: {
            callbacks: {
              label: (context: { label?: string; parsed?: number }) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      };
    }

    if (this.type === 'line') {
      return {
        ...commonOptions,
        scales: {
          x: {
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
            },
            ticks: {
              color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
            }
          }
        },
        elements: {
          line: {
            tension: 0.4
          }
        }
      };
    }

    return commonOptions;
  }

  // Method to update chart when data changes
  updateChart(newData: ChartData): void {
    if (!this.chart) return;

    this.chart.data.labels = newData.labels;
    this.chart.data.datasets = newData.datasets.map(dataset => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor,
      borderColor: dataset.borderColor,
      borderWidth: dataset.borderWidth || 1
    }));

    this.chart.update();
  }
}