const getSingleWeaponDPS = (
  weapon_bag: any,
  qty = 1, // Qantity of weapons
  targetSize = 1, // opponent target size
  armor = 1, // opponent armor
  isMoving = false, // move penalty multiplier
  cover = {
    accuracy_multiplier: 1, // opponent cover penalty
    damage_multiplier: 1,
    penetration_multiplier: 1,
  },
) => {
  //Formular: Hitchance * RateOfFire * Damage * ChanceToDamage(E.g. penetration)
  // since we assume it is an endless engagement we also encounter reload time
  // end we ignore intial time to setup the gun before starting the engagement.
  // Thus we compute: DamagePerClip/(TimeToEmptyClip+ReloadTime)
  // The default target size is 1. Possibly this can be parametrized
  // in future

  // _n = near, _m = mid _f = far

  // 1. compute rate of fire

  if (qty < 0) return [];

  // average aim time
  const avgAimTime =
    (parseFloat(weapon_bag.aim.fire_aim_time.max) +
      parseFloat(weapon_bag.aim.fire_aim_time.min)) /
    2;
  const aimTime_n = weapon_bag.aim.aim_time_multiplier.near * avgAimTime;
  const aimTime_m = weapon_bag.aim.aim_time_multiplier.mid * avgAimTime;
  const aimTime_f = weapon_bag.aim.aim_time_multiplier.far * avgAimTime;

  // 2. Compute burst
  let movingBurstMp = 1;
  if (isMoving) movingBurstMp = parseFloat(weapon_bag.moving.burst_multiplier);

  const avgBurstTime =
    (parseFloat(weapon_bag.burst.duration.max) + parseFloat(weapon_bag.burst.duration.min)) / 2;
  const burstTime_n = weapon_bag.burst.duration_multiplier.near * movingBurstMp * avgBurstTime;
  const burstTime_m = weapon_bag.burst.duration_multiplier.mid * movingBurstMp * avgBurstTime;
  const burstTime_f = weapon_bag.burst.duration_multiplier.far * movingBurstMp * avgBurstTime;

  const avgBurstRate =
    (parseFloat(weapon_bag.burst.rate_of_fire.max) +
      parseFloat(weapon_bag.burst.rate_of_fire.min)) /
    2;
  const burstRate_n = weapon_bag.burst.rate_of_fire_multiplier.near * avgBurstRate;
  const burstRate_m = weapon_bag.burst.rate_of_fire_multiplier.mid * avgBurstRate;
  const burstRate_f = weapon_bag.burst.rate_of_fire_multiplier.far * avgBurstRate;

  let movingCooldownMp = 1;
  if (isMoving) movingCooldownMp = parseFloat(weapon_bag.moving.cooldown_multiplier);

  // 3. Cooldown
  const avgCooldown =
    (parseFloat(weapon_bag.cooldown.duration.max) +
      parseFloat(weapon_bag.cooldown.duration.min)) /
    2;
  const cooldown_n =
    weapon_bag.cooldown.duration_multiplier.near * movingCooldownMp * avgCooldown;
  const cooldown_m = weapon_bag.cooldown.duration_multiplier.mid * movingCooldownMp * avgCooldown;
  const cooldown_f = weapon_bag.cooldown.duration_multiplier.far * movingCooldownMp * avgCooldown;

  // 4 wind up/down
  const windUp = weapon_bag.fire.wind_up;
  const windDown = weapon_bag.fire.wind_down;

  // Reload duration
  const avgReloadDuration =
    (parseFloat(weapon_bag.reload.duration.max) + parseFloat(weapon_bag.reload.duration.min)) / 2;
  const reloadTime_n = weapon_bag.reload.duration_multiplier.near * avgReloadDuration;
  const reloadTime_m = weapon_bag.reload.duration_multiplier.mid * avgReloadDuration;
  const reloadTime_f = weapon_bag.reload.duration_multiplier.far * avgReloadDuration;

  // Avg clipSize (measured in number of cooldowns, thus we need to add the first shot)
  const avgClipSize =
    (parseFloat(weapon_bag.reload.frequency.min) +
      parseFloat(weapon_bag.reload.frequency.max) +
      +2) /
    2;

  // duration per shot
  const shotDuration_n =
    aimTime_n + burstTime_n + cooldown_n + parseFloat(windDown || 0) + parseFloat(windUp);
  const shotDuration_m =
    aimTime_m + burstTime_m + cooldown_m + parseFloat(windDown || 0) + parseFloat(windUp);
  const shotDuration_f =
    aimTime_f + burstTime_f + cooldown_f + parseFloat(windDown || 0) + parseFloat(windUp);

  // Time to empty the clip and reload
  const clipTime_n = avgClipSize * shotDuration_n - avgCooldown + reloadTime_n;
  const clipTime_m = avgClipSize * shotDuration_m - avgCooldown + reloadTime_m;
  const clipTime_f = avgClipSize * shotDuration_f - avgCooldown + reloadTime_f;

  const avgDamage =
    ((parseFloat(weapon_bag.damage.max) + parseFloat(weapon_bag.damage.min)) *
      cover.damage_multiplier) /
    2;

  // penetration chance

  const penetration_n = Math.min(
    (weapon_bag.penetration.near * cover.penetration_multiplier) / armor,
    1,
  );
  const penetration_m = Math.min(
    (weapon_bag.penetration.mid * cover.penetration_multiplier) / armor,
    1,
  );
  const penetration_f = Math.min(
    (weapon_bag.penetration.far * cover.penetration_multiplier) / armor,
    1,
  );

  let moveAccuracyMp = 1;
  if (isMoving) moveAccuracyMp = parseFloat(weapon_bag.moving.accuracy_multiplier);

  // expected accuracy
  const accuracy_n =
    weapon_bag.accuracy.near * targetSize * moveAccuracyMp * cover.accuracy_multiplier;
  const accuracy_m =
    weapon_bag.accuracy.mid * targetSize * moveAccuracyMp * cover.accuracy_multiplier;
  const accuracy_f =
    weapon_bag.accuracy.far * targetSize * moveAccuracyMp * cover.accuracy_multiplier;

  let movePenalty = 1;
  if (weapon_bag.moving.can_fire_while_moving == "False" && isMoving == true) movePenalty = 0;

  // expected damage per clip including accuracy
  let dmgPerClip_n = avgClipSize * avgDamage * accuracy_n * penetration_n * movePenalty;
  let dmgPerClip_m = avgClipSize * avgDamage * accuracy_m * penetration_m * movePenalty;
  let dmgPerClip_f = avgClipSize * avgDamage * accuracy_f * penetration_f * movePenalty;

  // dmg for burst weapons
  if (weapon_bag.burst.can_burst === "True") {
    dmgPerClip_n =
      avgClipSize *
      avgDamage *
      burstRate_n *
      burstTime_n *
      accuracy_n *
      penetration_n *
      movePenalty;
    dmgPerClip_m =
      avgClipSize *
      avgDamage *
      burstRate_m *
      burstTime_m *
      accuracy_m *
      penetration_m *
      movePenalty;
    dmgPerClip_f =
      avgClipSize *
      avgDamage *
      burstRate_f *
      burstTime_f *
      accuracy_f *
      penetration_f *
      movePenalty;
  }

  // DPS infinite engagement with target size 1
  const dps_n = dmgPerClip_n / clipTime_n;
  const dps_m = dmgPerClip_m / clipTime_m;
  const dps_f = dmgPerClip_f / clipTime_f;

  // range
  let range_n = weapon_bag.range.distance.near;
  let range_m = weapon_bag.range.distance.mid;
  let range_f = weapon_bag.range.distance.far;

  if (range_n === -1) range_n = weapon_bag.range.min;
  if (range_m === -1) range_m = (weapon_bag.range.max - weapon_bag.range.min) / 2;
  if (range_f === -1) range_f = weapon_bag.range.max;

  return [
    { x: 0, y: dps_n * qty },
    { x: range_n, y: dps_n * qty },
    { x: range_m, y: dps_m * qty },
    { x: range_f, y: dps_f * qty },
  ];
};

export { getSingleWeaponDPS };
