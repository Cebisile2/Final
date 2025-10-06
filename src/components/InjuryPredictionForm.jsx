import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Calculator, TrendingUp, AlertTriangle } from "lucide-react";

export default function InjuryPredictionForm() {
  const [formData, setFormData] = useState({
    age: "",
    height: "",
    weight: "",
    position: "",
    minutesPlayed: "",
    gamesPlayed: "",
    previousInjuries: "",
    workRate: ""
  });
  
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const positions = ["Forward", "Midfielder", "Defender", "Goalkeeper"];
  const workRates = ["Low", "Medium", "High"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Mock prediction - replace this with your ML model API call
    setTimeout(() => {
      const mockPrediction = {
        injuryRisk: Math.round(Math.random() * 100),
        riskLevel: Math.random() > 0.7 ? "High" : Math.random() > 0.4 ? "Medium" : "Low",
        factors: [
          { name: "Age Factor", impact: Math.round(Math.random() * 30) },
          { name: "Workload", impact: Math.round(Math.random() * 40) },
          { name: "Previous Injuries", impact: Math.round(Math.random() * 20) },
          { name: "Position Risk", impact: Math.round(Math.random() * 25) }
        ],
        recommendations: [
          "Monitor training intensity closely",
          "Increase recovery time between sessions",
          "Focus on flexibility and mobility work",
          "Consider rotation with other players"
        ],
        professionalComparison: {
          similarPlayer: "Similar to Cristiano Ronaldo at age " + formData.age,
          comparisonRisk: Math.round(Math.random() * 100)
        }
      };
      
      setPrediction(mockPrediction);
      setLoading(false);
    }, 2000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateBMI = () => {
    if (formData.height && formData.weight) {
      const heightM = parseFloat(formData.height) / 100;
      const weightKg = parseFloat(formData.weight);
      return (weightKg / (heightM * heightM)).toFixed(1);
    }
    return "N/A";
  };

  const isFormValid = Object.values(formData).every(value => value.trim() !== "");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Brain className="w-6 h-6" />
            🤖 AI Injury Risk Predictor
          </CardTitle>
          <p className="text-sm text-purple-600">
            Enter player data to get AI-powered injury risk assessment
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Age (years)</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 22"
                  min="16"
                  max="40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 180"
                  min="150"
                  max="210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 75"
                  min="50"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Position</option>
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Minutes Played (season)</label>
                <input
                  type="number"
                  name="minutesPlayed"
                  value={formData.minutesPlayed}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 2400"
                  min="0"
                  max="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Games Played (season)</label>
                <input
                  type="number"
                  name="gamesPlayed"
                  value={formData.gamesPlayed}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 32"
                  min="0"
                  max="60"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Previous Injuries (days)</label>
                <input
                  type="number"
                  name="previousInjuries"
                  value={formData.previousInjuries}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 15"
                  min="0"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Work Rate</label>
                <select
                  name="workRate"
                  value={formData.workRate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Work Rate</option>
                  {workRates.map(rate => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">Calculated BMI</div>
                  <div className="text-2xl font-bold text-purple-600">{calculateBMI()}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
              >
                {loading ? (
                  <>
                    <Calculator className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Predict Injury Risk
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Prediction Results */}
      {prediction && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              🎯 AI Prediction Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Risk Score */}
            <div className="text-center">
              <div className={`inline-block px-6 py-3 rounded-full text-white font-bold text-2xl ${
                prediction.riskLevel === 'High' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                prediction.riskLevel === 'Medium' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-green-500 to-green-600'
              }`}>
                {prediction.injuryRisk}% INJURY RISK - {prediction.riskLevel.toUpperCase()}
              </div>
            </div>

            {/* Risk Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">📊 Risk Factor Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prediction.factors.map((factor, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{factor.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(factor.impact / 50) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{factor.impact}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">⚽ Professional Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-800 mb-2">
                      {prediction.professionalComparison.similarPlayer}
                    </div>
                    <div className="text-sm text-blue-600 mb-3">
                      Professional player with similar profile had {prediction.professionalComparison.comparisonRisk}% injury risk
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      prediction.injuryRisk > prediction.professionalComparison.comparisonRisk
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {prediction.injuryRisk > prediction.professionalComparison.comparisonRisk
                        ? 'Higher risk than comparison'
                        : 'Lower risk than comparison'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="bg-green-50 border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <AlertTriangle className="w-5 h-5" />
                  💡 AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prediction.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 bg-white p-3 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}