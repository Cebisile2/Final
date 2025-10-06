import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, ArcElement);

// Mock data for demonstration - in real app this would come from your injury prediction model
const generateMockData = () => {
  const players = [
    { name: 'John Smith', age: 19, position: 'Forward', injuryRisk: 75, gamesPlayed: 28, minutesPlayed: 2400 },
    { name: 'Mike Johnson', age: 22, position: 'Midfielder', injuryRisk: 45, gamesPlayed: 32, minutesPlayed: 2800 },
    { name: 'David Wilson', age: 24, position: 'Defender', injuryRisk: 30, gamesPlayed: 30, minutesPlayed: 2700 },
    { name: 'Alex Brown', age: 20, position: 'Goalkeeper', injuryRisk: 20, gamesPlayed: 35, minutesPlayed: 3150 },
    { name: 'Chris Davis', age: 18, position: 'Forward', injuryRisk: 65, gamesPlayed: 25, minutesPlayed: 2000 },
    { name: 'Tom Miller', age: 26, position: 'Midfielder', injuryRisk: 40, gamesPlayed: 33, minutesPlayed: 2900 },
  ];
  return players;
};

export function InjuryRiskChart() {
  const players = generateMockData();
  
  const data = {
    labels: players.map(p => p.name),
    datasets: [
      {
        label: 'Injury Risk %',
        data: players.map(p => p.injuryRisk),
        backgroundColor: players.map(p => 
          p.injuryRisk >= 70 ? '#ef4444' : 
          p.injuryRisk >= 50 ? '#f59e0b' : 
          '#10b981'
        ),
        borderColor: players.map(p => 
          p.injuryRisk >= 70 ? '#dc2626' : 
          p.injuryRisk >= 50 ? '#d97706' : 
          '#059669'
        ),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Player Injury Risk Assessment', font: { size: 16 } },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Risk %' } },
    },
  };

  return (
    <Card className="p-4">
      <div style={{ height: '300px' }}>
        <Bar data={data} options={options} />
      </div>
    </Card>
  );
}

export function WorkloadChart() {
  const players = generateMockData();
  
  const data = {
    labels: players.map(p => p.name),
    datasets: [
      {
        label: 'Minutes Played',
        data: players.map(p => p.minutesPlayed),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Games Played',
        data: players.map(p => p.gamesPlayed * 80), // Scale for visibility
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Player Workload Analysis', font: { size: 16 } },
      legend: { position: 'top' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Minutes / Games (x80)' } },
    },
  };

  return (
    <Card className="p-4">
      <div style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>
    </Card>
  );
}

export function TeamOverviewChart() {
  const players = generateMockData();
  
  const riskCategories = {
    'High Risk (70%+)': players.filter(p => p.injuryRisk >= 70).length,
    'Medium Risk (50-69%)': players.filter(p => p.injuryRisk >= 50 && p.injuryRisk < 70).length,
    'Low Risk (<50%)': players.filter(p => p.injuryRisk < 50).length,
  };

  const data = {
    labels: Object.keys(riskCategories),
    datasets: [
      {
        data: Object.values(riskCategories),
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderColor: ['#dc2626', '#d97706', '#059669'],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Team Injury Risk Overview', font: { size: 16 } },
      legend: { position: 'bottom' },
    },
  };

  return (
    <Card className="p-4">
      <div style={{ height: '300px' }}>
        <Doughnut data={data} options={options} />
      </div>
    </Card>
  );
}

export function PositionAnalysisChart() {
  const players = generateMockData();
  
  const positions = {};
  players.forEach(p => {
    if (!positions[p.position]) positions[p.position] = [];
    positions[p.position].push(p.injuryRisk);
  });

  const data = {
    labels: Object.keys(positions),
    datasets: [
      {
        label: 'Average Injury Risk %',
        data: Object.values(positions).map(risks => 
          risks.reduce((sum, risk) => sum + risk, 0) / risks.length
        ),
        backgroundColor: '#8b5cf6',
        borderColor: '#7c3aed',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Injury Risk by Position', font: { size: 16 } },
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Risk %' } },
    },
  };

  return (
    <Card className="p-4">
      <div style={{ height: '300px' }}>
        <Bar data={data} options={options} />
      </div>
    </Card>
  );
}

export function PerformanceTrendChart() {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
  
  const data = {
    labels: weeks,
    datasets: [
      {
        label: 'Team Average Risk',
        data: [45, 42, 48, 51, 47, 44],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Training Load',
        data: [65, 70, 68, 75, 72, 69],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Team Performance Trends', font: { size: 16 } },
      legend: { position: 'top' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Percentage' } },
    },
  };

  return (
    <Card className="p-4">
      <div style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>
    </Card>
  );
}