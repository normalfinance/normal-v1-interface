// ----------------------------------------------------------------------

// `cdn` without the @normalfinance/utils barrel. Importing it from the package
// pulls in the whole index, @stellar/stellar-sdk included, so a marketing page
// that only needs an image URL imports it from here. Same function, one source.
export { cdn, cdnAbsolute } from '../../../utils/src/cdn';
