'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { useFormContext } from 'react-hook-form';
import { IndexCoin } from '@/types/indexes';
import { NewIndexSchemaType } from './new-index-form'; // your main form type

type NewIndexSubmissionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export default function NewIndexSubmissionDialog({
  open,
  onClose,
  onSubmit,
}: NewIndexSubmissionDialogProps) {
  const { formState, watch } = useFormContext<NewIndexSchemaType>();
  const { isSubmitting, errors } = formState;

  // 1) Watch the weighting method
  const weightingMethod = watch('weightingMethod');
  // 2) Watch the coin list
  const coinList = watch('indexCoinList') || [];
  // 3) Compute sum of all indexPercentages if Custom
  const totalPercentage = coinList.reduce((acc, c) => acc + (c.indexPercentage ?? 0), 0);

  // We'll track our local error if the custom weighting sum != 100
  const [customError, setCustomError] = useState('');

  // Submit handler for the button
  const handleSubmitClick = async () => {
    // If weightingMethod is Custom, ensure sum = 100
    if (weightingMethod === 'Custom') {
      const sum = Math.round(totalPercentage);
      if (sum !== 100) {
        setCustomError(
          `Custom weighting must total 100%. Currently: ${totalPercentage.toFixed(2)}%`
        );
        return;
      }
    }

    // Clear old error if it exists
    setCustomError('');

    // If any form errors exist in react-hook-form, don't proceed
    // (Though normally you'd rely on onSubmit failing for an invalid form)
    if (Object.keys(errors).length > 0) {
      // You can gather them or just show a generic message
      return;
    }

    // If all good, call the parent's onSubmit
    try {
      await onSubmit();
      onClose();
    } catch (error) {
      // If there's an API error or something, handle here
      console.error(error);
    }
  };

  // Build error messages if fields are invalid
  const hasError = Object.keys(errors).length > 0 || customError;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm Submission</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          Please verify your inputs. Make sure all required fields are complete.
        </Typography>

        {/* If any required fields are missing or Custom sum is not 100 */}
        {hasError && (
          <Typography variant="body2" color="error">
            {customError
              ? customError
              : 'Please fill in all required fields or correct form errors.'}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <LoadingButton
          loading={isSubmitting}
          variant="soft"
          color="success"
          onClick={handleSubmitClick}
        >
          Submit
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
