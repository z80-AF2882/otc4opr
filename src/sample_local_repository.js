[
    {
        pattern: "@Beastmen",
        color: "#806633",
        datacardRenames: [
            "Ndoli Beast Lord => Gnoll Alpha",
            "Ndoli Elite => Gnoll Beta",
            "Ndoli Warriors # Spears => Gnoll Spearmen",
            "Ndoli Warriors => Gnoll Warriors",
            "Waheni Raiders => Gnoll Skirmishers",
        ],
        weaponRenames: [
            "Heavy Great Weapon => Terrifing Maul",
            "Heavy Hand Weapon => Ritual Knife",
            {
                predicate: "Hand Weapons",
                action: (target) =>
                    target.datacard.name === "Ndoli Warriors" ? "Longswords" : "Short swords"
            }
        ]
    },
]