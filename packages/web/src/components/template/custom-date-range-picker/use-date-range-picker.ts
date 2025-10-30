import type { IDatePickerControl } from '@/types/common';

import { useState, useCallback } from 'react';
import { format } from '@normalfinance/utils';

// ----------------------------------------------------------------------

export type UseDateRangePickerReturn = {
  startDate: IDatePickerControl;
  endDate: IDatePickerControl;
  onChangeStartDate: (newValue: IDatePickerControl) => void;
  onChangeEndDate: (newValue: IDatePickerControl) => void;
  /********/
  open: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onReset?: () => void;
  /********/
  selected?: boolean;
  error?: boolean;
  /********/
  label?: string;
  shortLabel?: string;
  /********/
  title?: string;
  variant?: 'calendar' | 'input';
  /********/
  setStartDate?: React.Dispatch<React.SetStateAction<IDatePickerControl>>;
  setEndDate?: React.Dispatch<React.SetStateAction<IDatePickerControl>>;
};

export function useDateRangePicker(
  start: IDatePickerControl,
  end: IDatePickerControl
): UseDateRangePickerReturn {
  const [open, setOpen] = useState(false);

  const [endDate, setEndDate] = useState(end as IDatePickerControl);
  const [startDate, setStartDate] = useState(start as IDatePickerControl);

  const error = format.fIsAfter(startDate, endDate);

  const onOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
  }, []);

  const onChangeStartDate = useCallback((newValue: IDatePickerControl) => {
    setStartDate(newValue);
  }, []);

  const onChangeEndDate = useCallback(
    (newValue: IDatePickerControl) => {
      if (error) {
        setEndDate(null);
      }
      setEndDate(newValue);
    },
    [error]
  );

  const onReset = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
  }, []);

  return {
    startDate: startDate as IDatePickerControl,
    endDate: endDate as IDatePickerControl,
    onChangeStartDate,
    onChangeEndDate,
    /********/
    open,
    onOpen,
    onClose,
    onReset,
    /********/
    error,
    selected: !!startDate && !!endDate,
    /********/
    label: format.fDateRangeShortLabel(startDate, endDate, true),
    shortLabel: format.fDateRangeShortLabel(startDate, endDate),
    /********/
    setStartDate,
    setEndDate,
  };
}
