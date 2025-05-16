// Hierarchical navigation structure from DITA map
const navigationConfig = [
  {
    id: "automotive-information",
    title: "Automotive Information",
    children: [
      { id: "history-of-automobiles", title: "History of Automobiles" },
      { id: "automobile-fundamentals", title: "Automobile Fundamentals" },
      { 
        id: "types-of-vehicles", 
        title: "Types of Vehicles",
        children: [
          { id: "electric-vehicles", title: "Electric Vehicles" }
        ]
      }
    ]
  },
  {
    id: "basic-maintenance",
    title: "Basic Maintenance",
    children: [
      { id: "emergency-repairs", title: "Emergency Repairs" },
      { id: "vehicle-maintenance", title: "Vehicle Maintenance" }
    ]
  },
  {
    id: "major-vehicle-components",
    title: "Major Vehicle Components",
    children: [
      { id: "electrical-systems", title: "Electrical Systems" },
      { id: "braking-systems", title: "Braking Systems" },
      { id: "engine-systems", title: "Engine Systems" }
    ]
  }
];
