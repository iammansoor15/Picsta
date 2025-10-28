/**
 * Background Toggle Service
 * Manages the toggle logic between remove bg and restore bg buttons
 * Provides centralized state management for button activation/deactivation
 */

class BackgroundToggleService {
  constructor() {
    this.listeners = [];
    this.currentState = {
      isBackgroundRemoved: false,
      removeBgEnabled: true,
      restoreBgEnabled: false
    };
  }

  /**
   * Add a listener to be notified of state changes
   * @param {Function} listener - Callback function to be called when state changes
   * @returns {Function} - Unsubscribe function
   */
  addListener(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change
   * @param {Object} newState - New state to broadcast
   */
  notifyListeners(newState) {
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        console.error('🚨 BackgroundToggleService: Error in listener:', error);
      }
    });
  }

  /**
   * Update the state and notify listeners
   * @param {Object} newState - New state values
   */
  updateState(newState) {
    const previousState = { ...this.currentState };
    this.currentState = { ...this.currentState, ...newState };
    
    console.log('🎯 BackgroundToggleService: State updated:', {
      from: previousState,
      to: this.currentState
    });

    this.notifyListeners(this.currentState);
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getCurrentState() {
    return { ...this.currentState };
  }

  /**
   * Enable Remove BG button and disable Restore BG button
   * Call this when background should be removed (original images are showing)
   */
  enableRemoveBackground() {
    console.log('🔴 BackgroundToggleService: Enabling Remove BG, Disabling Restore BG');
    
    this.updateState({
      isBackgroundRemoved: false,
      removeBgEnabled: true,
      restoreBgEnabled: false
    });

    return {
      success: true,
      message: 'Remove Background enabled',
      state: this.getCurrentState()
    };
  }

  /**
   * Enable Restore BG button and disable Remove BG button
   * Call this when background has been successfully removed
   */
  enableRestoreBackground() {
    console.log('🟢 BackgroundToggleService: Enabling Restore BG, Disabling Remove BG');
    
    this.updateState({
      isBackgroundRemoved: true,
      removeBgEnabled: false,
      restoreBgEnabled: true
    });

    return {
      success: true,
      message: 'Restore Background enabled',
      state: this.getCurrentState()
    };
  }

  /**
   * Handle successful background removal
   * Automatically toggles to restore state
   * @param {Object} options - Additional options
   * @returns {Object} Result object
   */
  onBackgroundRemovalSuccess(options = {}) {
    console.log('✅ BackgroundToggleService: Background removal successful, toggling to restore state');
    
    const result = this.enableRestoreBackground();
    
    return {
      ...result,
      action: 'background_removal_success',
      timestamp: new Date().toISOString(),
      options
    };
  }

  /**
   * Handle successful background restoration
   * Automatically toggles to remove state
   * @param {Object} options - Additional options
   * @returns {Object} Result object
   */
  onBackgroundRestoreSuccess(options = {}) {
    console.log('✅ BackgroundToggleService: Background restore successful, toggling to remove state');
    
    const result = this.enableRemoveBackground();
    
    return {
      ...result,
      action: 'background_restore_success',
      timestamp: new Date().toISOString(),
      options
    };
  }

  /**
   * Handle background removal failure
   * Maintains current state but can provide feedback
   * @param {Error} error - The error that occurred
   * @returns {Object} Result object
   */
  onBackgroundRemovalFailure(error) {
    console.error('❌ BackgroundToggleService: Background removal failed:', error?.message);
    
    return {
      success: false,
      action: 'background_removal_failure',
      message: 'Background removal failed, state unchanged',
      error: error?.message,
      state: this.getCurrentState(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle background restoration failure
   * Maintains current state but can provide feedback
   * @param {Error} error - The error that occurred
   * @returns {Object} Result object
   */
  onBackgroundRestoreFailure(error) {
    console.error('❌ BackgroundToggleService: Background restore failed:', error?.message);
    
    return {
      success: false,
      action: 'background_restore_failure',
      message: 'Background restore failed, state unchanged',
      error: error?.message,
      state: this.getCurrentState(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset to initial state (Remove BG enabled)
   * Useful when clearing all photos or starting fresh
   */
  reset() {
    console.log('🔄 BackgroundToggleService: Resetting to initial state');
    
    this.updateState({
      isBackgroundRemoved: false,
      removeBgEnabled: true,
      restoreBgEnabled: false
    });

    return {
      success: true,
      action: 'reset',
      message: 'Reset to initial state (Remove BG enabled)',
      state: this.getCurrentState(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize state based on current photo states
   * @param {Object} photoStates - Current photo states
   */
  initializeFromPhotoStates(photoStates) {
    const { photo1HasBackground, photo2HasBackground } = photoStates;
    
    // If any photo has background removed, enable restore
    const anyBackgroundRemoved = photo1HasBackground === false || photo2HasBackground === false;
    
    if (anyBackgroundRemoved) {
      this.enableRestoreBackground();
    } else {
      this.enableRemoveBackground();
    }

    console.log('🎯 BackgroundToggleService: Initialized from photo states:', {
      photoStates,
      resultingState: this.getCurrentState()
    });

    return this.getCurrentState();
  }

  /**
   * Get debug information about the service
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      currentState: this.getCurrentState(),
      listenerCount: this.listeners.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export default new BackgroundToggleService();