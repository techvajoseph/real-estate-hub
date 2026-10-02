"use client";
import { useEffect, useRef, type FormEvent } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Rental, RentalTransaction } from "@/lib/landlord/types";
export type LandlordModal =
  | "property"
  | "transaction"
  | "appointment"
  | "task"
  | "delete-property"
  | "delete-transaction"
  | null;
export function LandlordDialog({
  modal,
  close,
  rental,
  transaction,
  properties,
  date,
  pending,
  error,
  onSubmit,
  demo,
}: {
  modal: LandlordModal;
  close: () => void;
  rental: Rental | null;
  transaction: RentalTransaction | null;
  properties: Rental[];
  date: string;
  pending: boolean;
  error: string;
  onSubmit: (values: Record<string, FormDataEntryValue>) => void;
  demo: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) ref.current?.showModal();
    else ref.current?.close();
  }, [modal]);
  const title =
    modal === "property"
      ? rental
        ? "Edit rental property"
        : "Add a rental property"
      : modal === "transaction"
        ? transaction
          ? "Edit transaction"
          : "Record a transaction"
        : modal === "appointment"
          ? "Plan an appointment"
          : modal === "task"
            ? "Add a reminder"
            : modal === "delete-property"
              ? "Delete this property?"
              : "Delete this transaction?";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
  }
  return (
    <dialog
      className="ll-dialog"
      ref={ref}
      onCancel={close}
      aria-labelledby="ll-dialog-title"
    >
      <div className="ll-dialog-title">
        <div>
          <p>YOUR RENTAL WORKSPACE</p>
          <h2 id="ll-dialog-title">{title}</h2>
        </div>
        <button
          className="ll-icon-button"
          onClick={close}
          aria-label="Close dialog"
          disabled={pending}
        >
          <X size={20} />
        </button>
      </div>
      <form
        key={String(modal) + (rental?.id || "") + (transaction?.id || "")}
        onSubmit={submit}
        className="ll-form"
      >
        {modal === "property" && (
          <>
            <label>
              Property name
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={rental?.title}
                placeholder="e.g. The Courtyard Residence"
              />
            </label>
            <label>
              Street address
              <input
                name="address"
                required
                maxLength={240}
                defaultValue={rental?.address}
                placeholder="Address and unit number"
              />
            </label>
            <div className="ll-form-row">
              <label>
                City / region
                <input
                  name="city"
                  required
                  maxLength={120}
                  defaultValue={rental?.city}
                  placeholder="Brooklyn, NY"
                />
              </label>
              <label>
                Monthly rent (USD)
                <input
                  name="price"
                  type="number"
                  min="0"
                  max="10000000000"
                  step="0.01"
                  required
                  defaultValue={rental?.price}
                />
              </label>
            </div>
            <div className="ll-form-three">
              <label>
                Bedrooms
                <input
                  name="beds"
                  type="number"
                  min="0"
                  max="100"
                  required
                  defaultValue={rental?.beds ?? 0}
                />
              </label>
              <label>
                Bathrooms
                <input
                  name="baths"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  defaultValue={rental?.baths ?? 0}
                />
              </label>
              <label>
                Area (sqft)
                <input
                  name="sqft"
                  type="number"
                  min="0"
                  max="100000000"
                  required
                  defaultValue={rental?.sqft ?? 0}
                />
              </label>
            </div>
            <div className="ll-form-row">
              <label>
                Listing status
                <select
                  name="status"
                  aria-label="Listing status"
                  defaultValue={rental?.status || "draft"}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Available</option>
                  <option value="rented">Occupied</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                Photo URL
                <input
                  name="photo"
                  type={demo ? "text" : "url"}
                  maxLength={2000}
                  defaultValue={rental?.photo}
                  placeholder="https://..."
                />
              </label>
            </div>
            <h3>Tenant & lease details</h3>
            <label>
              Tenant name
              <input
                name="tenant_name"
                maxLength={120}
                defaultValue={rental?.tenant_name}
                placeholder="Optional"
              />
            </label>
            <div className="ll-form-row">
              <label>
                Tenant email
                <input
                  name="tenant_email"
                  type="email"
                  maxLength={254}
                  defaultValue={rental?.tenant_email}
                />
              </label>
              <label>
                Tenant phone
                <input
                  name="tenant_phone"
                  type="tel"
                  maxLength={40}
                  defaultValue={rental?.tenant_phone}
                />
              </label>
            </div>
            <div className="ll-form-row">
              <label>
                Lease starts
                <input
                  name="lease_start"
                  type="date"
                  defaultValue={rental?.lease_start ?? ""}
                />
              </label>
              <label>
                Lease ends
                <input
                  name="lease_end"
                  type="date"
                  defaultValue={rental?.lease_end ?? ""}
                />
              </label>
            </div>
            <label>
              Property notes
              <textarea
                name="notes"
                maxLength={3000}
                rows={3}
                defaultValue={rental?.notes}
                placeholder="Access instructions, upkeep, or other details..."
              />
            </label>
            <p className="ll-form-note">
              This is a private management record. No marketplace listing is
              published.
            </p>
          </>
        )}
        {modal === "transaction" && (
          <>
            <label>
              Property
              <select
                name="property_id"
                aria-label="Transaction property"
                required
                defaultValue={
                  transaction?.property_id || rental?.id || properties[0]?.id
                }
              >
                {properties.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="ll-form-row">
              <label>
                Type
                <select
                  name="kind"
                  aria-label="Transaction type"
                  defaultValue={transaction?.kind || "rent"}
                >
                  <option value="rent">Rental income</option>
                  <option value="expense">Property expense</option>
                </select>
              </label>
              <label>
                Amount (USD)
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  max="10000000000"
                  step="0.01"
                  required
                  defaultValue={transaction?.amount}
                />
              </label>
            </div>
            <label>
              Description
              <input
                name="description"
                required
                maxLength={200}
                defaultValue={transaction?.description}
                placeholder="e.g. October rent"
              />
            </label>
            <div className="ll-form-row">
              <label>
                Status
                <select
                  name="status"
                  aria-label="Payment status"
                  defaultValue={transaction?.status || "paid"}
                >
                  <option value="paid">Paid / received</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
              <label>
                Payment date / due date
                <input
                  name="occurred_on"
                  type="date"
                  required
                  defaultValue={transaction?.occurred_on || date}
                />
              </label>
            </div>
            <p className="ll-form-note">
              Records a payment or expense. No money is collected or
              transferred.
            </p>
          </>
        )}
        {modal === "appointment" && (
          <>
            <label>
              Appointment title
              <input
                name="title"
                required
                maxLength={120}
                placeholder="e.g. Property inspection"
              />
            </label>
            <label>
              Location
              <input
                name="location"
                maxLength={240}
                defaultValue={rental?.address || ""}
              />
            </label>
            <label>
              Date & time (Singapore)
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={date + "T10:00"}
              />
            </label>
            <p className="ll-form-note">
              Adds a personal calendar item. Invitations are not sent.
            </p>
          </>
        )}
        {modal === "task" && (
          <label>
            Reminder
            <input
              name="title"
              required
              maxLength={200}
              placeholder="e.g. Schedule the annual inspection"
            />
          </label>
        )}
        {modal === "delete-property" && (
          <div className="ll-delete-warning">
            <p>
              <strong>{rental?.title}</strong> and all its rental income and
              expense records will be permanently removed from your portfolio.
            </p>
            <p>The original marketplace listing will remain unchanged.</p>
            <label>
              Type DELETE to confirm
              <input
                name="confirmation"
                required
                pattern="DELETE"
                placeholder="DELETE"
                autoComplete="off"
              />
            </label>
          </div>
        )}
        {modal === "delete-transaction" && (
          <p className="ll-delete-warning">
            This removes <strong>{transaction?.description}</strong> from your
            ledger and updates the property’s analytics. It does not reverse a
            real payment.
          </p>
        )}
        {error && (
          <p role="alert" className="ll-form-error">
            {error}
          </p>
        )}
        <div className="ll-dialog-actions">
          <button
            type="button"
            className="ll-button secondary"
            onClick={close}
            disabled={pending}
          >
            Cancel
          </button>
          <Button
            type="submit"
            className={
              "ll-button " + (modal?.startsWith("delete") ? "danger" : "")
            }
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : modal?.startsWith("delete")
                ? "Delete permanently"
                : demo
                  ? "Save in preview"
                  : "Save changes"}
            {!modal?.startsWith("delete") && <ArrowRight size={15} />}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
