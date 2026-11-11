'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export interface GrowthDataPoint {
  name: string;
  users: number;
  listings?: number;
}

export default function PlatformGrowthChart({ data }: { data: GrowthDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="userCurveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#04793d" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#04793d" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          stroke="#71717a"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#71717a"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={[0, 20]}
          ticks={[0, 5, 10, 15, 20]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            borderColor: '#27272a',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Area
          type="monotone"
          dataKey="users"
          stroke="#04793d"
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#userCurveGrad)"
          dot={{ r: 4, fill: '#04793d', stroke: '#fff', strokeWidth: 1.5 }}
          activeDot={{ r: 6, fill: '#04793d' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
