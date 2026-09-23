import br from 'flag-icons/flags/4x3/br.svg'
import us from 'flag-icons/flags/4x3/us.svg'
import pt from 'flag-icons/flags/4x3/pt.svg'
import ar from 'flag-icons/flags/4x3/ar.svg'
import gb from 'flag-icons/flags/4x3/gb.svg'
import ca from 'flag-icons/flags/4x3/ca.svg'
import de from 'flag-icons/flags/4x3/de.svg'
import fr from 'flag-icons/flags/4x3/fr.svg'
import mx from 'flag-icons/flags/4x3/mx.svg'
import cl from 'flag-icons/flags/4x3/cl.svg'
import es from 'flag-icons/flags/4x3/es.svg'
import au from 'flag-icons/flags/4x3/au.svg'

const flags: Record<string, string> = {
  BR: br,
  US: us,
  PT: pt,
  AR: ar,
  GB: gb,
  CA: ca,
  DE: de,
  FR: fr,
  MX: mx,
  CL: cl,
  ES: es,
  AU: au,
}
export function CountryFlag({ code }: { code: string }) {
  return <img className="country-flag" src={flags[code]} alt="" width={21} height={16} />
}
