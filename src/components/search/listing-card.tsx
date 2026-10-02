import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import { PropertyImage } from "@/components/property-image";
import { photoUrl } from "@/lib/photos";
import {
  formatAddress,
  formatPrice,
  isApproximateLocation,
  listingLabel,
  type PropertyCard,
} from "@/lib/listing-format";

type Props = {
  property: PropertyCard;
  active: boolean;
  onHover: (id: string | null) => void;
  onLocate: (id: string) => void;
};

export function ListingCard({ property: p, active, onHover, onLocate }: Props) {
  const address = formatAddress(p);
  const facts = [
    p.beds !== null && (
      <span key="bd">
        <b>{p.beds}</b> bds
      </span>
    ),
    p.baths !== null && (
      <span key="ba">
        <b>{p.baths}</b> ba
      </span>
    ),
    p.sqft !== null && (
      <span key="sq">
        <b>{p.sqft.toLocaleString()}</b> sqft
      </span>
    ),
  ].filter(Boolean);
  const hasPin = p.latitude !== null && p.longitude !== null;

  return (
    <article
      className={active ? "listing-card is-active" : "listing-card"}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(p.id)}
      onBlur={() => onHover(null)}
    >
      <div className="listing-photo">
        <Link href={`/properties/${p.id}`} className="listing-photo-link" aria-label={`View ${address}`} tabIndex={-1}>
          <PropertyImage key={p.photos[0]} src={p.photos[0] ? photoUrl(p.photos[0], "card") : undefined} alt={address} />
        </Link>
        {p.days_on_market !== null && p.days_on_market <= 7 && (
          <span className="listing-badge">{p.days_on_market <= 1 ? "New listing" : `${p.days_on_market} days on market`}</span>
        )}
        <Link className="listing-save" href={`/properties/${p.id}#save-home`} aria-label={`Save ${address}`}>
          <Heart size={18} />
        </Link>
        {p.photos.length > 1 && <span className="listing-photo-count">{p.photos.length} photos</span>}
      </div>

      <div className="listing-body">
        <div className="listing-price-row">
          <Link href={`/properties/${p.id}`} className="listing-price">
            {formatPrice(p.price, p.listing_type)}
          </Link>
          {hasPin && (
            <button type="button" className="listing-locate" onClick={() => onLocate(p.id)} aria-label={`Show ${address} on map`}>
              <MapPin size={16} />
            </button>
          )}
        </div>
        <p className="listing-facts">
          {facts.length > 0 && facts.reduce<React.ReactNode[]>((acc, f, i) => (i ? [...acc, <i key={`s${i}`}>|</i>, f] : [f]), [])}
          <span className="listing-kind"> — {listingLabel(p)}</span>
        </p>
        <p className="listing-address">
          {address}
          {isApproximateLocation(p.address_line) && <span className="listing-approx"> · approx. location</span>}
        </p>
        {p.broker_name && <p className="listing-broker">{p.broker_name}</p>}
      </div>
    </article>
  );
}
