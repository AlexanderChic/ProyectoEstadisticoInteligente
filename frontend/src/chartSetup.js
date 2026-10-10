import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Registro global de los elementos de Chart.js usados en la aplicación.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const PALETA = [
  '#0d6efd', '#20c997', '#fd7e14', '#6f42c1', '#dc3545',
  '#0dcaf0', '#ffc107', '#198754', '#d63384', '#6610f2',
];
