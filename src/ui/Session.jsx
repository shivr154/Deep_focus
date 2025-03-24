import React, { useState, useEffect } from 'react';

const SessionBlocker = () => {
  const [websites, setWebsites] = useState("");
  const [selectedApps, setSelectedApps] = useState([]);
  const [availableApps, setAvailableApps] = useState([]);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionWebsites, setSessionWebsites] = useState([]);
  const [sessionApps, setSessionApps] = useState([]);

  useEffect(() => {
    const fetchProcesses = async () => {
      try{
        // console.log("Before the fetched proceess:");
        const processes = await window.electronAPI.getRunningProcesses();
        // console.log("Fetched processes:", processes);
        setAvailableApps(processes);
      }
      catch (error){
        console.error("Error fetching running processes:", error);
      }
    };
    fetchProcesses();

    const intervalId = setInterval(fetchProcesses, 5000);

  // Cleanup function to clear interval when component unmounts
  return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let timer;
    if (sessionActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (sessionActive && timeLeft === 0) {
      stopSession();
    }
    return () => clearInterval(timer);
  }, [sessionActive, timeLeft]);

  const handleSelectApp = (appName) => {
    setSelectedApps((prev) =>
      prev.includes(appName)
        ? prev.filter(app => app !== appName)
        : [...prev, appName]
    );
  };

  const startSession = async () => {
    const websiteList = websites
      .split(',')
      .map(site => site.trim())
      .filter(Boolean);

    if (websiteList.length === 0 && selectedApps.length === 0) {
      alert("Please specify at least one website or application to block.");
      return;
    }
    if (sessionDuration <= 0) {
      alert("Please set a valid session duration (in minutes).");
      return;
    }

    const confirmationMessage = `Start a blocking session for ${sessionDuration} minutes for:\n\n` +
      `Websites: ${websiteList.join(", ") || "None"}\n` +
      `Applications: ${selectedApps.join(", ") || "None"}\n\nProceed?`;
    if (!window.confirm(confirmationMessage)) return;

    if (websiteList.length > 0) {
      const websiteResult = await window.electronAPI.blockWebsites(websiteList);
      if (!websiteResult.success) {
        alert("Error blocking websites: " + websiteResult.error);
        return;
      }
    }

    if (selectedApps.length > 0) {
      const appResult = await window.electronAPI.startAppBlocking(selectedApps);
      if (!appResult.success) {
        alert("Error starting application blocking: " + appResult.error);
        return;
      }
    }

    setSessionWebsites(websiteList);
    setSessionApps(selectedApps);
    setSessionActive(true);
    setTimeLeft(sessionDuration * 60);
  };

  const stopSession = async () => {
    const unblockResult = await window.electronAPI.unblockWebsites();
    if (!unblockResult.success) {
      alert("Error unblocking websites: " + unblockResult.error);
    }
    const stopAppResult = await window.electronAPI.stopAppBlocking();
    if (!stopAppResult.success) {
      alert("Error stopping application blocking: " + stopAppResult.error);
    }
    setSessionActive(false);
    setTimeLeft(0);
    setSessionWebsites([]);
    setSessionApps([]);
    alert("Blocking session ended.");
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = sessionDuration * 60;
  const progressPercentage = totalTime ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {!sessionActive ? (
        <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl">
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-100">
              Start Blocking Session
            </h2>
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-lg font-medium text-gray-300">
                  Websites to Block
                </label>
                <input
                  type="text"
                  value={websites}
                  onChange={(e) => setWebsites(e.target.value)}
                  placeholder="e.g. facebook.com, twitter.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-lg font-medium text-gray-300">
                  Select Applications to Block
                </label>
                <div className="h-64 overflow-y-auto border border-gray-600 rounded-lg p-6 bg-gray-700">
                  {availableApps.length > 0 ? (
                    <div className="space-y-4">
                      {availableApps.map(app => (
                        <div key={app} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={app}
                            checked={selectedApps.includes(app)}
                            onChange={() => handleSelectApp(app)}
                            className="w-5 h-5 rounded border-gray-500 bg-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-700"
                          />
                          <label htmlFor={app} className="text-lg text-gray-200">
                            {app}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-lg text-gray-400">Loading applications...</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-lg font-medium text-gray-300">
                  Session Duration (minutes)
                </label>
                <input
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value, 10))}
                  min="1"
                  className="w-40 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                />
              </div>

              <button
                onClick={startSession}
                className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg text-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-gray-900 flex flex-col">
          <div className="container mx-auto px-4 py-8 flex flex-col h-full max-w-6xl">
            <div className="mb-12 text-center">
              <h1 className="text-4xl font-bold text-gray-100 mb-8">Active Blocking Session</h1>
              <div className="max-w-2xl mx-auto">
                <p className="text-3xl font-semibold text-gray-100 mb-4">
                  Time Remaining: {formatTime(timeLeft)}
                </p>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <h2 className="text-2xl font-semibold text-gray-100 mb-4">Blocked Websites</h2>
                {sessionWebsites.length > 0 ? (
                  <ul className="space-y-3">
                    {sessionWebsites.map((site, index) => (
                      <li 
                        key={index} 
                        className="flex items-center text-lg text-gray-300 bg-gray-800/50 rounded-lg p-3"
                      >
                        <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                        {site}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-lg">No websites blocked</p>
                )}
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur">
                <h2 className="text-2xl font-semibold text-gray-100 mb-4">Blocked Applications</h2>
                {sessionApps.length > 0 ? (
                  <ul className="space-y-3">
                    {sessionApps.map((app, index) => (
                      <li 
                        key={index} 
                        className="flex items-center text-lg text-gray-300 bg-gray-800/50 rounded-lg p-3"
                      >
                        <span className="h-2 w-2 bg-indigo-500 rounded-full mr-3"></span>
                        {app}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-lg">No applications blocked</p>
                )}
              </div>
            </div>

            <div className="max-w-xl mx-auto w-full">
              <button
                onClick={stopSession}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-xl text-xl font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors shadow-lg"
              >
                Stop Session Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionBlocker;