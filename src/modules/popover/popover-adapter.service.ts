import {
  ElementRef,
  Injectable,
  Renderer2
} from '@angular/core';

import { SkyWindowRefService } from '../window';

import {
  SkyPopoverAlignment,
  SkyPopoverPlacement,
  SkyPopoverPosition
} from './types';

export interface SkyPopoverCoordinates {
  isOutsideViewport: boolean;
  top?: number;
  left?: number;
}

export interface SkyPopoverArrowCoordinates {
  top: number;
  left: number;
}

export interface SkyPopoverAdapterElements {
  popover: ElementRef;
  popoverArrow: ElementRef;
  caller: ElementRef;
}

@Injectable()
export class SkyPopoverAdapterService {
  constructor(
    private renderer: Renderer2,
    private windowRef: SkyWindowRefService
  ) { }

  public getPopoverPosition(
    elements: SkyPopoverAdapterElements,
    placement: SkyPopoverPlacement,
    alignment: SkyPopoverAlignment
  ): SkyPopoverPosition {
    const max = 4;

    let counter = 0;
    let coords: SkyPopoverCoordinates = {
      top: undefined,
      left: undefined,
      isOutsideViewport: true
    };

    if (this.popoverLargerThanParent(elements) || !placement || placement === 'fullscreen') {
      placement = 'fullscreen';
    } else {
      do {
        coords = this.getPopoverCoordinates(elements, placement, alignment);
        if (coords.isOutsideViewport) {
          placement = (counter % 2 === 0) ?
            this.getInversePlacement(placement) :
            this.getNextPlacement(placement);
        }
      } while (coords.isOutsideViewport && ++counter < max);

      if (counter === max) {
        placement = 'fullscreen';
      }
    }

    const arrowCoords = this.getArrowCoordinates(elements, coords, placement);

    return {
      top: coords.top,
      left: coords.left,
      arrowTop: arrowCoords.top,
      arrowLeft: arrowCoords.left,
      placement,
      alignment
    };
  }

  public hidePopover(elem: ElementRef): void {
    this.renderer.addClass(elem.nativeElement, 'sky-popover-hidden');
  }

  public showPopover(elem: ElementRef): void {
    this.renderer.removeClass(elem.nativeElement, 'sky-popover-hidden');
  }

  private getPopoverCoordinates(
    elements: SkyPopoverAdapterElements,
    placement: SkyPopoverPlacement,
    alignment: SkyPopoverAlignment
  ): SkyPopoverCoordinates {
    const callerElement = elements.caller.nativeElement;
    const popoverElement = elements.popover.nativeElement;

    const callerRect = callerElement.getBoundingClientRect();
    const popoverRect = popoverElement.getBoundingClientRect();

    const callerOffsetLeft = callerElement.offsetLeft;
    const callerOffsetTop = callerElement.offsetTop;

    const windowObj = this.windowRef.getWindow();
    const documentWidth = windowObj.document.body.clientWidth;
    const documentHeight = windowObj.document.body.clientHeight;
    const viewportOffsetBottom = windowObj.innerHeight + windowObj.pageYOffset;

    let top: number;
    let left: number;
    let bleedLeft = 0;
    let bleedRight = 0;
    let bleedTop = 0;
    let bleedBottom = 0;
    let isOutsideViewport = false;

    /* tslint:disable:switch-default */
    switch (placement) {
      case 'above':
      top = callerOffsetTop - popoverRect.height;
      bleedTop = callerRect.top - popoverRect.height;
      break;

      case 'below':
      top = callerOffsetTop + callerRect.height;
      bleedBottom = viewportOffsetBottom - (callerRect.top + callerRect.height + popoverRect.height + windowObj.pageYOffset);
      break;

      case 'right':
      left = callerOffsetLeft + callerRect.width;
      bleedRight = documentWidth - (callerRect.left + callerRect.width + popoverRect.width);
      break;

      case 'left':
      left = callerOffsetLeft - popoverRect.width;
      bleedLeft = callerRect.left - popoverRect.width;
      break;
    }
    /* tslint:enable */

    if (placement === 'right' || placement === 'left') {
      top = callerOffsetTop - (popoverRect.height / 2) + (callerRect.height / 2);
      bleedTop = windowObj.pageYOffset + (callerRect.top - (popoverRect.height / 2) + (callerRect.height / 2));
      bleedBottom = documentHeight - (callerRect.top + windowObj.pageYOffset + ((callerRect.height / 2) + (popoverRect.height / 2)));
    }

    // Make adjustments based on horizontal alignment.
    if (placement === 'above' || placement === 'below') {
      /* tslint:disable:switch-default */
      switch (alignment) {
        case 'center':
        left = callerOffsetLeft - (popoverRect.width / 2) + (callerRect.width / 2);
        bleedLeft = callerRect.left - (popoverRect.width / 2) + (callerRect.width / 2);
        bleedRight = documentWidth - (callerRect.left + (popoverRect.width / 2) + (callerRect.width / 2));
        break;

        case 'left':
        left = callerOffsetLeft;
        bleedLeft = callerRect.left;
        bleedRight = documentWidth - (bleedLeft + popoverRect.width);
        break;

        case 'right':
        left = callerOffsetLeft - popoverRect.width + callerRect.width;
        bleedLeft = callerRect.left - popoverRect.width + callerRect.width;
        bleedRight = documentWidth - (callerRect.left + callerRect.width);
        break;
      }
      /* tslint:enable */
    }

    // Clipped on left?
    if (bleedLeft < 0) {
      if (placement === 'left') {
        isOutsideViewport = true;
      }

      left -= bleedLeft;

      // Prevent popover's left boundary from leaving the bounds of the caller.
      if (callerRect.left < 0) {
        left = callerOffsetLeft;
      }
    }

    // Clipped on right?
    if (bleedRight < 0) {
      if (placement === 'right') {
        isOutsideViewport = true;
      }

      left += bleedRight;

      // Prevent popover's right boundary from leaving the bounds of the caller.
      if (left + popoverRect.width < callerOffsetLeft + callerRect.width) {
        left = callerOffsetLeft - popoverRect.width + callerRect.width;
      }
    }

    // Clipped on top?
    if (bleedTop < 0) {
      if (placement === 'above') {
        isOutsideViewport = true;
      }

      top -= bleedTop;
    }

    // Clipped on bottom?
    if (bleedBottom < 0) {
      if (placement === 'below') {
        isOutsideViewport = true;
      }

      top += bleedBottom;
    }

    return {
      top,
      left,
      isOutsideViewport
    };
  }

  private getArrowCoordinates(
    elements: SkyPopoverAdapterElements,
    popoverCoords: SkyPopoverCoordinates,
    placement: SkyPopoverPlacement
  ): SkyPopoverArrowCoordinates {
    const callerRect = elements.caller.nativeElement.getBoundingClientRect();
    const popoverRect = elements.popover.nativeElement.getBoundingClientRect();

    const callerOffsetTop = elements.caller.nativeElement.offsetTop;
    const callerOffsetLeft = elements.caller.nativeElement.offsetLeft;

    let left: number;
    let top: number;

    switch (placement) {
      default:
      case 'above':
      case 'below':
      left = callerOffsetLeft - popoverCoords.left + (callerRect.width / 2);
      break;

      case 'right':
      case 'left':
      top = callerOffsetTop - popoverCoords.top + (callerRect.height / 2);
      break;
    }

    // The arrow has exceded the bounds of the popover;
    // default to the CSS className position.
    if (left < 0 || left > popoverRect.width || isNaN(left)) {
      left = undefined;
    }

    return { top, left };
  }

  private popoverLargerThanParent(elements: SkyPopoverAdapterElements) {
    const popoverRect = elements.popover.nativeElement.getBoundingClientRect();
    const windowObj = this.windowRef.getWindow();
    const parentHeight = windowObj.document.body.clientHeight;
    const parentWidth = windowObj.document.body.clientWidth;

    return (popoverRect.height > parentHeight || popoverRect.width > parentWidth);
  }

  private getNextPlacement(placement: SkyPopoverPlacement): SkyPopoverPlacement {
    const placements: SkyPopoverPlacement[] = ['above', 'right', 'below', 'left'];
    const index = placements.indexOf(placement) + 1;
    return placements[index];
  }

  private getInversePlacement(placement: SkyPopoverPlacement): SkyPopoverPlacement {
    const pairings: any = { above: 'below', below: 'above', right: 'left', left: 'right' };
    return pairings[placement] as SkyPopoverPlacement;
  }
}
