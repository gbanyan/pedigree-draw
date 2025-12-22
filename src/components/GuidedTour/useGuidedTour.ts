import { useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import type { Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getTourSteps, getTourLocale } from './tourSteps';

const TOUR_COMPLETED_KEY = 'pedigree-draw-tour-completed';

export function useGuidedTour() {
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    const steps = getTourSteps();
    const locale = getTourLocale();

    // Create driver instance
    driverRef.current = driver({
      showProgress: true,
      steps,
      nextBtnText: locale.nextBtnText,
      prevBtnText: locale.prevBtnText,
      doneBtnText: locale.doneBtnText,
      onDestroyStarted: () => {
        // Mark tour as completed when user finishes or closes
        localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
        driverRef.current?.destroy();
      },
    });

    // Start the tour
    driverRef.current.drive();
  }, []);

  const hasCompletedTour = useCallback(() => {
    return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
  }, []);

  const resetTourStatus = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
  }, []);

  return {
    startTour,
    hasCompletedTour,
    resetTourStatus,
  };
}
