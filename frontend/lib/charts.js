'use client';

/**
 * Recharts re-export wrapper.
 * Isolates recharts from the main App Router webpack graph to prevent
 * module factory race conditions (TypeError: Cannot read properties of
 * undefined reading 'call') in Next.js 14.
 *
 * Import charts from this file instead of directly from 'recharts'.
 */
export {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
