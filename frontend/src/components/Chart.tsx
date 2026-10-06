"use client";

import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface ChartProps {
  option: any;
  height?: string;
  className?: string;
}

export default function Chart({ option, height = "480px", className = "" }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Inicialització del Canvas i gestió del ResizeObserver
  useEffect(() => {
    const dom = containerRef.current;
    if (!dom) return;

    const chart = echarts.init(dom, undefined, {
      renderer: "canvas",
    });
    chartInstance.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      // Comprovació segura de la instància local sense consultar el DOM
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    });

    resizeObserver.observe(dom);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Actualització reactiva de les dades del gràfic
  useEffect(() => {
    if (!chartInstance.current || chartInstance.current.isDisposed()) return;
    if (option && Object.keys(option).length > 0) {
      chartInstance.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }
  }, [option]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", minHeight: height }}
      className={`w-full relative ${className}`}
    />
  );
}