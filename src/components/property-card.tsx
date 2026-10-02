import Link from "next/link";
import { Bath, BedDouble, ArrowUpRight, Heart, Maximize, MapPin } from "lucide-react";
import { PropertyImage } from "@/components/property-image";
import { photoUrl } from "@/lib/photos";
import { formatAddress, formatPrice, type PropertyCard as Card } from "@/lib/properties";

const TYPE_LABEL = { for_sale: "For sale", for_rent: "For rent", sold: "Sold" } as const;
export function PropertyCard({ property }: { property: Card }) {
  const address = formatAddress(property);
  return (
    <article className="property-card">
      <div className="property-photo">
        <Link href={`/properties/${property.id}`} aria-label={`View ${address}`}>
          <PropertyImage key={property.photos[0]} src={property.photos[0] ? photoUrl(property.photos[0], "card") : undefined} alt={address} />
        </Link>
        <span className="property-status"><span />{TYPE_LABEL[property.listing_type]}</span>
        <Link className="property-save" href={`/properties/${property.id}#save-home`} aria-label={`Save ${address}`}><Heart size={18} /></Link>
        <span className="photo-count">{property.photos.length} photos</span>
      </div>
      <Link href={`/properties/${property.id}`} className="property-body">
        <div className="price-row"><h3>{formatPrice(property.price, property.listing_type)}</h3><ArrowUpRight size={19} /></div>
        <p className="property-address">{property.address_line || "Discover this home"}</p>
        <p className="property-locality"><MapPin size={13} />{[property.city, property.state, property.zip].filter(Boolean).join(", ") || "Location details available on listing"}</p>
        <div className="property-facts">
          {property.beds !== null && <span><BedDouble size={16} /><b>{property.beds}</b> beds</span>}
          {property.baths !== null && <span><Bath size={16} /><b>{property.baths}</b> baths</span>}
          {property.sqft !== null && <span><Maximize size={15} /><b>{property.sqft.toLocaleString()}</b> sqft</span>}
        </div>
      </Link>
    </article>
  );
}
