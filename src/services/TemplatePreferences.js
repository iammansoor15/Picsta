import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  RELIGION: '@template_pref_religion',
  RELIGIONS: '@template_pref_religions',
  SUBCATEGORY: '@template_pref_subcategory',
};

const DEFAULTS = {
  religion: 'hindu',
  religions: ['hindu'],
  subcategory: 'congratulations',
};

async function getReligion() {
  try {
    // Prefer plural selection if present
    const arrRaw = await AsyncStorage.getItem(KEYS.RELIGIONS);
    if (arrRaw) {
      try {
        const arr = JSON.parse(arrRaw);
        if (Array.isArray(arr) && arr.length > 0) return arr[0];
      } catch {}
    }
    const v = await AsyncStorage.getItem(KEYS.RELIGION);
    return v || DEFAULTS.religion;
  } catch {
    return DEFAULTS.religion;
  }
}

async function setReligion(value) {
  try {
    const val = String(value || DEFAULTS.religion);
    await AsyncStorage.setItem(KEYS.RELIGION, val);
    await AsyncStorage.setItem(KEYS.RELIGIONS, JSON.stringify([val]));
  } catch {}
}

async function getReligions() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RELIGIONS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
    // Fallback to single value
    const single = await AsyncStorage.getItem(KEYS.RELIGION);
    return single ? [single] : DEFAULTS.religions;
  } catch {
    return DEFAULTS.religions;
  }
}

async function setReligions(values) {
  try {
    let arr = Array.isArray(values) ? values.filter(Boolean) : [];
    // Normalize 'all' -> all specific options
    const lower = arr.map(v => String(v).toLowerCase().trim());
    if (lower.includes('all')) {
      lower.splice(0, lower.length, 'hindu', 'muslim', 'christian');
    }
    await AsyncStorage.setItem(KEYS.RELIGIONS, JSON.stringify(lower));
    if (lower.length > 0) {
      await AsyncStorage.setItem(KEYS.RELIGION, lower[0]);
    }
  } catch {}
}

async function getSubcategory() {
  try {
    const v = await AsyncStorage.getItem(KEYS.SUBCATEGORY);
    return v || DEFAULTS.subcategory;
  } catch {
    return DEFAULTS.subcategory;
  }
}

async function setSubcategory(value) {
  try { await AsyncStorage.setItem(KEYS.SUBCATEGORY, String(value || DEFAULTS.subcategory)); } catch {}
}

export default {
  KEYS,
  DEFAULTS,
  getReligion,
  setReligion,
  getReligions,
  setReligions,
  getSubcategory,
  setSubcategory,
};
