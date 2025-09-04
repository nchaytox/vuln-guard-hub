import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface CveBarChartProps {
  categories: string[];
  values: number[];
}

const Dashboard: React.FC<CveBarChartProps> = ({ categories, values }) => {
  const options: ApexOptions = {
    chart: {
      type: "bar", 
    },
    xaxis: {
      categories,
    },
    title: {
      text: "Top CVEs par Criticité",
      align: "center",
    },
  };

  const series = [
    {
      name: "Nombre de CVEs",
      data: values,
    },
  ];

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="bar" height={350} />
    </div>
  );
};

export default Dashboard;
