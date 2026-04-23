import { useEffect, useRef, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useInvoices } from '../context/InvoiceContext'
import { generateId, addDays, formatCurrency } from '../utils/helpers'

const PAYMENT_TERMS = [1, 7, 14, 30]

function FormField({ label, id, error, children }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <label
        htmlFor={id}
        className={`text-[12px] font-medium ${error ? 'text-[#EC5757]' : 'text-[#7E88C3] dark:text-[#DFE3FA]'}`}
      >
        {label}
        {error && <span className="float-right text-[#EC5757]">{error}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ id, error, register, ...props }) {
  return (
    <input
      id={id}
      className={`w-full px-5 py-4 rounded-md font-bold text-[12px] text-[#0C0E16] dark:text-white bg-white dark:bg-[#1E2139] border ${
        error
          ? 'border-[#EC5757]'
          : 'border-[#DFE3FA] dark:border-[#252945] focus:border-[#7C5DFA] dark:focus:border-[#7C5DFA]'
      } outline-none transition-colors`}
      {...register}
      {...props}
    />
  )
}

export default function InvoiceForm({ onClose, invoice }) {
  const { addInvoice, updateInvoice } = useInvoices()
  const isEditing = Boolean(invoice)
  const overlayRef = useRef(null)
  const [paymentTermsOpen, setPaymentTermsOpen] = useState(false)
  const paymentTermsRef = useRef(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: isEditing ? {
      senderStreet: invoice.senderAddress?.street || '',
      senderCity: invoice.senderAddress?.city || '',
      senderPostCode: invoice.senderAddress?.postCode || '',
      senderCountry: invoice.senderAddress?.country || '',
      clientName: invoice.clientName || '',
      clientEmail: invoice.clientEmail || '',
      clientStreet: invoice.clientAddress?.street || '',
      clientCity: invoice.clientAddress?.city || '',
      clientPostCode: invoice.clientAddress?.postCode || '',
      clientCountry: invoice.clientAddress?.country || '',
      createdAt: invoice.createdAt || '',
      paymentTerms: invoice.paymentTerms || 30,
      description: invoice.description || '',
      items: invoice.items || [],
    } : {
      senderStreet: '',
      senderCity: '',
      senderPostCode: '',
      senderCountry: '',
      clientName: '',
      clientEmail: '',
      clientStreet: '',
      clientCity: '',
      clientPostCode: '',
      clientCountry: '',
      createdAt: new Date().toISOString().split('T')[0],
      paymentTerms: 30,
      description: '',
      items: [{ name: '', quantity: 1, price: 0, total: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const watchedPaymentTerms = watch('paymentTerms')
  const watchedCreatedAt = watch('createdAt')

  useEffect(() => {
    function handleClickOutside(e) {
      if (paymentTermsRef.current && !paymentTermsRef.current.contains(e.target)) {
        setPaymentTermsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function buildInvoiceData(data, status) {
    const items = (data.items || []).map(item => ({
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      total: Number(item.quantity) * Number(item.price),
    }))
    const total = items.reduce((sum, item) => sum + item.total, 0)
    const paymentDue = addDays(data.createdAt, Number(data.paymentTerms))

    return {
      senderAddress: {
        street: data.senderStreet,
        city: data.senderCity,
        postCode: data.senderPostCode,
        country: data.senderCountry,
      },
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientAddress: {
        street: data.clientStreet,
        city: data.clientCity,
        postCode: data.clientPostCode,
        country: data.clientCountry,
      },
      createdAt: data.createdAt,
      paymentDue,
      paymentTerms: Number(data.paymentTerms),
      description: data.description,
      items,
      total,
      status,
    }
  }

  const [noItemsError, setNoItemsError] = useState(false)

  function onSubmitPending(data) {
    if (fields.length === 0) {
      setNoItemsError(true)
      return
    }
    setNoItemsError(false)
    const invoiceData = buildInvoiceData(data, 'pending')
    if (isEditing) {
      updateInvoice(invoice.id, invoiceData)
    } else {
      addInvoice({ id: generateId(), ...invoiceData })
    }
    onClose()
  }

  function onSaveDraft() {
    const data = getValues()
    const invoiceData = buildInvoiceData(data, 'draft')
    addInvoice({ id: generateId(), ...invoiceData })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? `Edit Invoice #${invoice?.id}` : 'New Invoice'}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 bg-white dark:bg-[#141625] w-full max-w-[720px] lg:max-w-[719px] lg:ml-[103px] h-full overflow-y-auto scrollbar-hide animate-slide-in rounded-r-[20px]">
        {/* Back button on mobile */}
        <div className="lg:hidden pt-8 px-6">
          <button
            onClick={onClose}
            className="flex items-center gap-4 font-bold text-[12px] text-[#0C0E16] dark:text-white hover:text-[#888EB0] transition-colors"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6 1L2 5L6 9" stroke="#7C5DFA" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Go back
          </button>
        </div>

        <div className="px-6 sm:px-14 pt-8 sm:pt-14 pb-8">
          <h1 className="text-[24px] font-bold text-[#0C0E16] dark:text-white mb-11">
            {isEditing ? (
              <>Edit <span className="text-[#888EB0]">#</span>{invoice?.id}</>
            ) : (
              'New Invoice'
            )}
          </h1>

          <form onSubmit={handleSubmit(onSubmitPending)} noValidate>
            {/* Bill From */}
            <section aria-labelledby="bill-from-label" className="mb-10">
              <h2 id="bill-from-label" className="text-[12px] font-bold text-[#7C5DFA] mb-6">Bill From</h2>
              <div className="flex flex-col gap-6">
                <FormField label="Street Address" id="senderStreet" error={errors.senderStreet?.message}>
                  <Input
                    id="senderStreet"
                    error={errors.senderStreet}
                    register={register('senderStreet')}
                  />
                </FormField>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <FormField label="City" id="senderCity" error={errors.senderCity?.message}>
                    <Input id="senderCity" error={errors.senderCity} register={register('senderCity')} />
                  </FormField>
                  <FormField label="Post Code" id="senderPostCode" error={errors.senderPostCode?.message}>
                    <Input id="senderPostCode" error={errors.senderPostCode} register={register('senderPostCode')} />
                  </FormField>
                  <div className="col-span-2 sm:col-span-1">
                    <FormField label="Country" id="senderCountry" error={errors.senderCountry?.message}>
                      <Input id="senderCountry" error={errors.senderCountry} register={register('senderCountry')} />
                    </FormField>
                  </div>
                </div>
              </div>
            </section>

            {/* Bill To */}
            <section aria-labelledby="bill-to-label" className="mb-10">
              <h2 id="bill-to-label" className="text-[12px] font-bold text-[#7C5DFA] mb-6">Bill To</h2>
              <div className="flex flex-col gap-6">
                <FormField label="Client's Name" id="clientName" error={errors.clientName?.message}>
                  <Input
                    id="clientName"
                    error={errors.clientName}
                    register={register('clientName', { required: "can't be empty" })}
                  />
                </FormField>
                <FormField label="Client's Email" id="clientEmail" error={errors.clientEmail?.message}>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="e.g. email@example.com"
                    error={errors.clientEmail}
                    register={register('clientEmail', {
                      required: "can't be empty",
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'invalid email' },
                    })}
                  />
                </FormField>
                <FormField label="Street Address" id="clientStreet" error={errors.clientStreet?.message}>
                  <Input id="clientStreet" error={errors.clientStreet} register={register('clientStreet')} />
                </FormField>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <FormField label="City" id="clientCity" error={errors.clientCity?.message}>
                    <Input id="clientCity" error={errors.clientCity} register={register('clientCity')} />
                  </FormField>
                  <FormField label="Post Code" id="clientPostCode" error={errors.clientPostCode?.message}>
                    <Input id="clientPostCode" error={errors.clientPostCode} register={register('clientPostCode')} />
                  </FormField>
                  <div className="col-span-2 sm:col-span-1">
                    <FormField label="Country" id="clientCountry" error={errors.clientCountry?.message}>
                      <Input id="clientCountry" error={errors.clientCountry} register={register('clientCountry')} />
                    </FormField>
                  </div>
                </div>
              </div>
            </section>

            {/* Invoice Details */}
            <section aria-labelledby="invoice-details-label" className="mb-10">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField label="Invoice Date" id="createdAt" error={errors.createdAt?.message}>
                    <Input
                      id="createdAt"
                      type="date"
                      error={errors.createdAt}
                      register={register('createdAt', { required: "can't be empty" })}
                      disabled={isEditing}
                    />
                  </FormField>

                  {/* Payment Terms */}
                  <div className="flex flex-col gap-[10px]">
                    <label
                      htmlFor="paymentTerms"
                      className="text-[12px] font-medium text-[#7E88C3] dark:text-[#DFE3FA]"
                    >
                      Payment Terms
                    </label>
                    <div className="relative" ref={paymentTermsRef}>
                      <button
                        type="button"
                        id="paymentTerms"
                        onClick={() => setPaymentTermsOpen(p => !p)}
                        className="w-full px-5 py-4 rounded-md font-bold text-[12px] text-[#0C0E16] dark:text-white bg-white dark:bg-[#1E2139] border border-[#DFE3FA] dark:border-[#252945] focus:border-[#7C5DFA] outline-none flex items-center justify-between"
                        aria-haspopup="listbox"
                        aria-expanded={paymentTermsOpen}
                      >
                        Net {watchedPaymentTerms} {watchedPaymentTerms === 1 ? 'Day' : 'Days'}
                        <svg
                          width="11" height="7" viewBox="0 0 11 7" fill="none"
                          className={`transition-transform ${paymentTermsOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        >
                          <path d="M1 1L5.5 5.5L10 1" stroke="#7C5DFA" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {paymentTermsOpen && (
                        <ul
                          className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-[#252945] rounded-md shadow-lg z-50 overflow-hidden border border-[#DFE3FA] dark:border-[#252945]"
                          role="listbox"
                          aria-label="Select payment terms"
                        >
                          {PAYMENT_TERMS.map(term => (
                            <li key={term}>
                              <button
                                type="button"
                                onClick={() => {
                                  setValue('paymentTerms', term)
                                  setPaymentTermsOpen(false)
                                }}
                                className={`w-full px-5 py-4 text-left font-bold text-[12px] border-b last:border-0 border-[#DFE3FA] dark:border-[#494E6E] hover:text-[#7C5DFA] transition-colors ${
                                  watchedPaymentTerms === term
                                    ? 'text-[#7C5DFA]'
                                    : 'text-[#0C0E16] dark:text-white'
                                }`}
                                role="option"
                                aria-selected={watchedPaymentTerms === term}
                              >
                                Net {term} {term === 1 ? 'Day' : 'Days'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <FormField label="Project Description" id="description" error={errors.description?.message}>
                  <Input
                    id="description"
                    placeholder="e.g. Graphic Design Service"
                    error={errors.description}
                    register={register('description', { required: "can't be empty" })}
                  />
                </FormField>
              </div>
            </section>

            {/* Item List */}
            <section aria-labelledby="item-list-label" className="mb-16">
              <h2 id="item-list-label" className="text-[18px] font-bold text-[#777F98] dark:text-[#777F98] mb-4">Item List</h2>

              {fields.length > 0 && (
                <div className="mb-4">
                  {/* Desktop headers */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_80px_110px_110px_32px] gap-4 mb-2">
                    <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium">Item Name</span>
                    <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium">Qty.</span>
                    <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium">Price</span>
                    <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium">Total</span>
                    <span />
                  </div>

                  {fields.map((field, index) => {
                    const qty = Number(watchedItems?.[index]?.quantity || 0)
                    const price = Number(watchedItems?.[index]?.price || 0)
                    const total = qty * price

                    return (
                      <div key={field.id} className="mb-6">
                        {/* Mobile: stacked */}
                        <div className="sm:hidden flex flex-col gap-4">
                          <FormField
                            label="Item Name"
                            id={`items.${index}.name`}
                            error={errors.items?.[index]?.name?.message}
                          >
                            <Input
                              id={`items.${index}.name`}
                              error={errors.items?.[index]?.name}
                              register={register(`items.${index}.name`, { required: "required" })}
                            />
                          </FormField>
                          <div className="grid grid-cols-3 gap-4 items-end">
                            <FormField label="Qty." id={`items.${index}.quantity`} error={errors.items?.[index]?.quantity?.message}>
                              <Input
                                id={`items.${index}.quantity`}
                                type="number"
                                min="1"
                                error={errors.items?.[index]?.quantity}
                                register={register(`items.${index}.quantity`, { required: true, min: { value: 1, message: 'min 1' } })}
                              />
                            </FormField>
                            <FormField label="Price" id={`items.${index}.price`} error={errors.items?.[index]?.price?.message}>
                              <Input
                                id={`items.${index}.price`}
                                type="number"
                                min="0"
                                step="0.01"
                                error={errors.items?.[index]?.price}
                                register={register(`items.${index}.price`, { required: true, min: { value: 0, message: 'min 0' } })}
                              />
                            </FormField>
                            <div className="flex flex-col gap-[10px]">
                              <span className="text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] font-medium">Total</span>
                              <div className="flex items-center justify-between py-4">
                                <span className="font-bold text-[12px] text-[#888EB0]">
                                  {total.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-[#888EB0] hover:text-[#EC5757] transition-colors"
                                  aria-label={`Remove item ${index + 1}`}
                                >
                                  <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M8.44442 0L9.33333 0.888875H13V2.66663H0V0.888875H3.55558L4.44449 0H8.44442ZM1.77778 16C0.8 16 0 15.2 0 14.2222V3.55554H11.5556V14.2222C11.5556 15.2 10.7556 16 9.77778 16H1.77778Z" fill="currentColor"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop: row */}
                        <div className="hidden sm:grid sm:grid-cols-[1fr_80px_110px_110px_32px] gap-4 items-center">
                          <Input
                            id={`items.${index}.name-desktop`}
                            error={errors.items?.[index]?.name}
                            register={register(`items.${index}.name`, { required: "required" })}
                            aria-label="Item name"
                          />
                          <Input
                            id={`items.${index}.quantity-desktop`}
                            type="number"
                            min="1"
                            error={errors.items?.[index]?.quantity}
                            register={register(`items.${index}.quantity`, { required: true, min: 1 })}
                            aria-label="Quantity"
                          />
                          <Input
                            id={`items.${index}.price-desktop`}
                            type="number"
                            min="0"
                            step="0.01"
                            error={errors.items?.[index]?.price}
                            register={register(`items.${index}.price`, { required: true, min: 0 })}
                            aria-label="Price"
                          />
                          <div className="py-4 font-bold text-[12px] text-[#888EB0]">
                            {total.toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-[#888EB0] hover:text-[#EC5757] transition-colors"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path fillRule="evenodd" clipRule="evenodd" d="M8.44442 0L9.33333 0.888875H13V2.66663H0V0.888875H3.55558L4.44449 0H8.44442ZM1.77778 16C0.8 16 0 15.2 0 14.2222V3.55554H11.5556V14.2222C11.5556 15.2 10.7556 16 9.77778 16H1.77778Z" fill="currentColor"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => append({ name: '', quantity: 1, price: 0, total: 0 })}
                className="w-full py-4 rounded-full font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] bg-[#F9FAFE] dark:bg-[#252945] hover:bg-[#DFE3FA] dark:hover:bg-[#0C0E16] transition-colors"
                aria-label="Add new item"
              >
                + Add New Item
              </button>

              {errors.items && typeof errors.items.message === 'string' && (
                <p className="text-[#EC5757] text-[10px] mt-2">{errors.items.message}</p>
              )}
            </section>

            {/* Validation Errors Summary */}
            {(Object.keys(errors).length > 0 || noItemsError) && (
              <div className="mb-8" role="alert" aria-live="polite">
                {Object.keys(errors).length > 0 && (
                  <p className="text-[#EC5757] text-[10px] font-semibold">- All fields must be added</p>
                )}
                {noItemsError && (
                  <p className="text-[#EC5757] text-[10px] font-semibold">- An item must be added</p>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className={`flex gap-2 ${isEditing ? 'justify-end' : 'justify-between'}`}>
              {!isEditing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-4 rounded-full font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] bg-[#F9FAFE] dark:bg-[#252945] hover:bg-[#DFE3FA] dark:hover:bg-[#DFE3FA] dark:hover:text-[#0C0E16] transition-colors"
                >
                  Discard
                </button>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-4 rounded-full font-bold text-[12px] text-[#7E88C3] dark:text-[#DFE3FA] bg-[#F9FAFE] dark:bg-[#252945] hover:bg-[#DFE3FA] dark:hover:bg-[#DFE3FA] dark:hover:text-[#0C0E16] transition-colors"
                >
                  Cancel
                </button>
              )}
              <div className="flex gap-2">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={onSaveDraft}
                    className="px-6 py-4 rounded-full font-bold text-[12px] text-[#888EB0] dark:text-[#DFE3FA] bg-[#373B53] hover:bg-[#0C0E16] dark:hover:bg-[#1E2139] transition-colors"
                  >
                    Save as Draft
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-4 rounded-full font-bold text-[12px] text-white bg-[#7C5DFA] hover:bg-[#9277FF] transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Save & Send'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
