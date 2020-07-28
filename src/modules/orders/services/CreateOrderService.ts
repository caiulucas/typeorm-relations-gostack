import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const findCustomer = await this.customersRepository.findById(customer_id);

    if (!findCustomer) throw new AppError('Customer not found');

    const findProducts = await this.productsRepository.findAllById(products);

    if (!findProducts || findProducts.length === 0)
      throw new AppError('No such products');

    findProducts.forEach((product, index) => {
      if (product.quantity - products[index].quantity < 0) {
        throw new AppError('Not enough products');
      }
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer: findCustomer,
      products: findProducts.map((product, index) => ({
        ...product,
        product_id: product.id,
        quantity: products[index].quantity,
      })),
    });

    return order;
  }
}

export default CreateOrderService;
